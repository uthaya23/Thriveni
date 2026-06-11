const InventoryItem = require('../models/InventoryItem');
const InventoryTransaction = require('../models/InventoryTransaction');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');

// @desc    Get all inventory items
// @route   GET /api/inventory
// @access  Private
exports.getItems = asyncHandler(async (req, res) => {
  const items = await InventoryItem.find().sort({ itemName: 1 });
  
  // Calculate status per item
  const enrichedItems = items.map(item => {
    const itemObj = item.toObject();
    if (itemObj.currentStock <= itemObj.minStockLevel) {
      itemObj.status = 'Low Stock';
    } else {
      itemObj.status = 'In Stock';
    }
    return itemObj;
  });

  res.json(ApiResponse.success('Inventory items retrieved successfully', enrichedItems));
});

// @desc    Create new inventory item
// @route   POST /api/inventory
// @access  Private
exports.createItem = asyncHandler(async (req, res) => {
  const { 
    itemName, category, unit, openingStock, minStockLevel, 
    unitCost, storeLocation, batchNumber, expiryDate 
  } = req.body;

  const itemExists = await InventoryItem.findOne({ itemName: { $regex: new RegExp(`^${itemName}$`, 'i') } });

  if (itemExists) {
    return res.status(400).json(ApiResponse.error('Item with this name already exists'));
  }

  const item = await InventoryItem.create({
    itemName,
    category,
    unit,
    openingStock: Number(openingStock) || 0,
    currentStock: Number(openingStock) || 0,
    minStockLevel: Number(minStockLevel) || 0,
    unitCost: Number(unitCost) || 0,
    storeLocation,
    batchNumber,
    expiryDate
  });

  res.status(201).json(ApiResponse.success('Inventory item created successfully', item));
});

// @desc    Record inventory transaction (Receive / Issue)
// @route   POST /api/inventory/transaction
// @access  Private
exports.recordTransaction = asyncHandler(async (req, res) => {
  const { type, itemId, quantity, job, issuedTo, purpose, supplier, invoiceNumber, remarks } = req.body;

  if (!type || !itemId || !quantity) {
    return res.status(400).json(ApiResponse.error('Type, Item, and Quantity are required'));
  }

  const item = await InventoryItem.findById(itemId);
  if (!item) {
    return res.status(404).json(ApiResponse.error('Item not found'));
  }

  const qty = Number(quantity);

  if (type === 'Issued' && item.currentStock < qty) {
    return res.status(400).json(ApiResponse.error(`Insufficient stock. Current stock is ${item.currentStock} ${item.unit}`));
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Determine unit cost (use item's current cost)
    // If receiving new stock with different price, could average, but for Phase 1 we keep it simple.
    // If receiving, and user provided unitCost, update the item's unitCost? Let's stick to using the item's unitCost for now.
    const transactionUnitCost = req.body.unitCost ? Number(req.body.unitCost) : item.unitCost;
    const totalCost = qty * transactionUnitCost;

    const transaction = await InventoryTransaction.create([{
      type,
      item: itemId,
      quantity: qty,
      job: job || null,
      issuedTo,
      purpose,
      supplier,
      invoiceNumber,
      unitCost: transactionUnitCost,
      totalCost,
      recordedBy: req.user._id,
      remarks
    }], { session });

    // Update item stock
    if (type === 'Received') {
      item.currentStock += qty;
      // Optionally update unit cost to latest
      if (req.body.unitCost) {
        item.unitCost = transactionUnitCost;
      }
    } else if (type === 'Issued') {
      item.currentStock -= qty;
    }

    await item.save({ session });
    await session.commitTransaction();
    
    // Fetch transaction populated with item and job
    const populatedTransaction = await InventoryTransaction.findById(transaction[0]._id)
      .populate('item', 'itemName category unit')
      .populate('job', 'jobNo equipmentModel')
      .populate('recordedBy', 'name');

    res.status(201).json(ApiResponse.success('Transaction recorded successfully', populatedTransaction));
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
});

// @desc    Get all transactions
// @route   GET /api/inventory/transactions
// @access  Private
exports.getTransactions = asyncHandler(async (req, res) => {
  const transactions = await InventoryTransaction.find()
    .populate('item', 'itemName category unit')
    .populate('job', 'jobNo equipmentModel description')
    .populate('recordedBy', 'name')
    .sort({ date: -1 })
    .limit(100); // For phase 1, limit to last 100

  res.json(ApiResponse.success('Transactions retrieved successfully', transactions));
});

// @desc    Get monthly consumption report
// @route   GET /api/inventory/report/monthly
// @access  Private
exports.getMonthlyConsumption = asyncHandler(async (req, res) => {
  const { month, year } = req.query;
  
  const targetMonth = month ? parseInt(month) : new Date().getMonth() + 1;
  const targetYear = year ? parseInt(year) : new Date().getFullYear();

  const startDate = new Date(targetYear, targetMonth - 1, 1);
  const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

  // Aggregate issued transactions
  const report = await InventoryTransaction.aggregate([
    {
      $match: {
        type: 'Issued',
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$item',
        totalQuantity: { $sum: '$quantity' },
        totalCost: { $sum: '$totalCost' },
        transactionCount: { $sum: 1 }
      }
    },
    {
      $lookup: {
        from: 'inventoryitems',
        localField: '_id',
        foreignField: '_id',
        as: 'itemDetails'
      }
    },
    {
      $unwind: '$itemDetails'
    },
    {
      $project: {
        _id: 1,
        totalQuantity: 1,
        totalCost: 1,
        transactionCount: 1,
        itemName: '$itemDetails.itemName',
        category: '$itemDetails.category',
        unit: '$itemDetails.unit',
        unitCost: '$itemDetails.unitCost'
      }
    },
    {
      $sort: { totalCost: -1 } // Sort by highest cost
    }
  ]);

  const summary = {
    totalItemsConsumed: report.length,
    totalCost: report.reduce((sum, item) => sum + item.totalCost, 0),
    period: `${startDate.toLocaleString('default', { month: 'long' })} ${targetYear}`,
    items: report
  };

  res.json(ApiResponse.success('Monthly consumption report generated', summary));
});

// @desc    Get material consumption by job
// @route   GET /api/inventory/report/job/:jobId
// @access  Private
exports.getJobConsumption = asyncHandler(async (req, res) => {
  const { jobId } = req.params;

  const transactions = await InventoryTransaction.find({ job: jobId, type: 'Issued' })
    .populate('item', 'itemName category unit unitCost')
    .sort({ date: -1 });

  const totalCost = transactions.reduce((sum, t) => sum + t.totalCost, 0);

  res.json(ApiResponse.success('Job consumption retrieved', { transactions, totalCost }));
});
