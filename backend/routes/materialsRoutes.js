const express = require('express');
const router = express.Router();
const resolveJobId = require('../middleware/resolveJobId');
const Materials = require('../models/Materials');
const InventoryItem = require('../models/InventoryItem');
const InventoryTransaction = require('../models/InventoryTransaction');
const Job = require('../models/Job');
const { protect, notTechnician } = require('../middleware/authMiddleware');
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const ApiResponse = require('../utils/apiResponse');

router.use(protect);
router.use(notTechnician);

// GET /api/materials/:jobId
router.get('/:jobId', resolveJobId('jobId'), asyncHandler(async (req, res) => {
  const doc = await Materials.findOne({ job: req.params.jobId })
    .populate('requestedBy', 'name')
    .populate('approvedBy', 'name')
    .populate('items.inventoryItem');
  res.json(ApiResponse.success('Materials retrieved successfully', doc || { items: [] }));
}));

// POST /api/materials/:jobId — create or replace
router.post('/:jobId', resolveJobId('jobId'), asyncHandler(async (req, res) => {
  const jobId = req.params.jobId;
  const jobDoc = await Job.findById(jobId);
  if (!jobDoc) return res.status(404).json(ApiResponse.notFound('Job not found'));

  // Get current materials document to see previous state (for rollback or diffing)
  const existingDoc = await Materials.findOne({ job: jobId });
  const existingItemsMap = new Map();
  if (existingDoc && existingDoc.items) {
    existingDoc.items.forEach(item => {
      if (item.issuedTransaction) {
        existingItemsMap.set(item._id.toString(), item);
      }
    });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const rawItems = req.body.items || [];
    const processedItems = [];

    for (const item of rawItems) {
      const qty = parseFloat(item.quantity) || 0;
      const tc = parseFloat(item.totalCost) || 0;
      const processedItem = {
        ...item,
        totalCost: tc,
        unitCost: qty > 0 ? tc / qty : 0
      };

      // Check if this item had a previous transaction
      const existingItem = item._id ? existingItemsMap.get(item._id.toString()) : null;
      
      if (processedItem.inventoryItem && processedItem.status === 'Received') {
        if (existingItem) {
          // It was already marked as Received.
          // Did the quantity change?
          const qtyDiff = processedItem.quantity - existingItem.quantity;
          if (qtyDiff !== 0) {
            const invItem = await InventoryItem.findById(processedItem.inventoryItem).session(session);
            if (!invItem) throw new Error(`Inventory item not found: ${processedItem.description}`);
            if (invItem.currentStock < qtyDiff) {
              throw new Error(`Insufficient stock for ${processedItem.description}. Available: ${invItem.currentStock}`);
            }
            // Update stock
            invItem.currentStock -= qtyDiff;
            await invItem.save({ session });

            // Update transaction
            const tx = await InventoryTransaction.findById(existingItem.issuedTransaction).session(session);
            if (tx) {
              tx.quantity = processedItem.quantity;
              tx.totalCost = processedItem.quantity * processedItem.unitCost;
              await tx.save({ session });
            }
          }
          processedItem.issuedTransaction = existingItem.issuedTransaction;
          // Remove from map so we know it wasn't deleted
          existingItemsMap.delete(item._id.toString());
        } else {
          // New "Received" transaction or newly status changed to "Received"
          const invItem = await InventoryItem.findById(processedItem.inventoryItem).session(session);
          if (!invItem) throw new Error(`Inventory item not found: ${processedItem.description}`);
          if (invItem.currentStock < processedItem.quantity) {
            throw new Error(`Insufficient stock for ${processedItem.description}. Available: ${invItem.currentStock}`);
          }
          
          // Deduct stock
          invItem.currentStock -= processedItem.quantity;
          await invItem.save({ session });

          // Create transaction
          const [tx] = await InventoryTransaction.create([{
            type: 'Issued',
            item: processedItem.inventoryItem,
            quantity: processedItem.quantity,
            job: jobId,
            recordedBy: req.user._id,
            purpose: `Requisition for Job #${jobDoc.jobNo}`,
            unitCost: processedItem.unitCost,
            totalCost: processedItem.totalCost
          }], { session });

          processedItem.issuedTransaction = tx._id;
        }
      } else {
        // If it was previously Received but is now NOT received, or is not linked
        if (existingItem) {
          // Reverse stock deduction
          const invItem = await InventoryItem.findById(existingItem.inventoryItem).session(session);
          if (invItem) {
            invItem.currentStock += existingItem.quantity;
            await invItem.save({ session });
          }
          // Remove transaction
          await InventoryTransaction.findByIdAndDelete(existingItem.issuedTransaction).session(session);
          processedItem.issuedTransaction = undefined;
          
          existingItemsMap.delete(item._id.toString());
        }
      }

      processedItems.push(processedItem);
    }

    // Any items left in existingItemsMap were deleted by the user
    for (const [id, deletedItem] of existingItemsMap.entries()) {
      const invItem = await InventoryItem.findById(deletedItem.inventoryItem).session(session);
      if (invItem) {
        invItem.currentStock += deletedItem.quantity;
        await invItem.save({ session });
      }
      await InventoryTransaction.findByIdAndDelete(deletedItem.issuedTransaction).session(session);
    }

    const totalEstimatedCost = processedItems.reduce((sum, i) => sum + (i.totalCost || 0), 0);

    const doc = await Materials.findOneAndUpdate(
      { job: jobId },
      { 
        items: processedItems, 
        totalEstimatedCost, 
        job: jobId, 
        requestedBy: req.user._id,
        notes: req.body.notes
      },
      { new: true, upsert: true, runValidators: true, session }
    );

    await session.commitTransaction();
    res.json(ApiResponse.success('Materials saved successfully', doc));
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json(ApiResponse.badRequest(error.message || 'Error saving materials'));
  } finally {
    session.endSession();
  }
}));

// PATCH /api/materials/:jobId/item/:itemId — update single item status
router.patch('/:jobId/item/:itemId', resolveJobId('jobId'), asyncHandler(async (req, res) => {
  const jobId = req.params.jobId;
  const jobDoc = await Job.findById(jobId);
  if (!jobDoc) return res.status(404).json(ApiResponse.notFound('Job not found'));

  const doc = await Materials.findOne({ job: jobId });
  if (!doc) return res.status(404).json(ApiResponse.notFound('Materials not found'));
  const item = doc.items.id(req.params.itemId);
  if (!item) return res.status(404).json(ApiResponse.notFound('Item not found'));

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const oldStatus = item.status;
    const oldQty = item.quantity;
    
    // Apply changes
    Object.assign(item, req.body);
    const qty = parseFloat(item.quantity) || 0;
    const tc = parseFloat(item.totalCost) || 0;
    item.totalCost = tc;
    item.unitCost = qty > 0 ? tc / qty : 0;

    if (item.inventoryItem) {
      const isNowReceived = item.status === 'Received';
      const wasReceived = oldStatus === 'Received' && item.issuedTransaction;

      if (isNowReceived && !wasReceived) {
        // Need to issue stock
        const invItem = await InventoryItem.findById(item.inventoryItem).session(session);
        if (!invItem) throw new Error(`Inventory item not found: ${item.description}`);
        if (invItem.currentStock < item.quantity) {
          throw new Error(`Insufficient stock for ${item.description}. Available: ${invItem.currentStock}`);
        }
        invItem.currentStock -= item.quantity;
        await invItem.save({ session });

        const [tx] = await InventoryTransaction.create([{
          type: 'Issued',
          item: item.inventoryItem,
          quantity: item.quantity,
          job: jobId,
          recordedBy: req.user._id,
          purpose: `Requisition for Job #${jobDoc.jobNo}`,
          unitCost: item.unitCost,
          totalCost: item.totalCost
        }], { session });

        item.issuedTransaction = tx._id;
      } else if (!isNowReceived && wasReceived) {
        // Reverse stock
        const invItem = await InventoryItem.findById(item.inventoryItem).session(session);
        if (invItem) {
          invItem.currentStock += oldQty;
          await invItem.save({ session });
        }
        await InventoryTransaction.findByIdAndDelete(item.issuedTransaction).session(session);
        item.issuedTransaction = undefined;
      } else if (isNowReceived && wasReceived && item.quantity !== oldQty) {
        // Quantity changed
        const qtyDiff = item.quantity - oldQty;
        const invItem = await InventoryItem.findById(item.inventoryItem).session(session);
        if (!invItem) throw new Error(`Inventory item not found: ${item.description}`);
        if (invItem.currentStock < qtyDiff) {
          throw new Error(`Insufficient stock for ${item.description}. Available: ${invItem.currentStock}`);
        }
        invItem.currentStock -= qtyDiff;
        await invItem.save({ session });

        const tx = await InventoryTransaction.findById(item.issuedTransaction).session(session);
        if (tx) {
          tx.quantity = item.quantity;
          tx.totalCost = item.totalCost;
          await tx.save({ session });
        }
      }
    }

    doc.totalEstimatedCost = doc.items.reduce((s, i) => s + (i.totalCost || 0), 0);
    await doc.save({ session });
    
    await session.commitTransaction();
    res.json(ApiResponse.success('Material item updated successfully', doc));
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json(ApiResponse.badRequest(error.message || 'Error updating item'));
  } finally {
    session.endSession();
  }
}));

module.exports = router;
