const ProductionPlan = require('../models/ProductionPlan');
const Job = require('../models/Job');
const ApiResponse = require('../utils/apiResponse');

class ProductionPlanController {
  /**
   * Create new production target & retro-link outstanding jobs
   */
  static async createPlanItem(req, res, next) {
    try {
      const { financialYear, quarter, month, make, model, description, scopeOfWork, plannedQty, prPoStatus, remark } = req.body;
      
      const remarksHistory = [];
      if (remark && remark.trim() !== '') {
        remarksHistory.push({
          remark: remark,
          date: new Date(),
          user: req.user?._id
        });
      }

      const planItem = new ProductionPlan({
        financialYear: financialYear || '2026-2027',
        quarter: quarter || 'Q1',
        month, 
        make, 
        model, 
        description, 
        scopeOfWork, 
        plannedQty: Number(plannedQty || 0), 
        prPoStatus: prPoStatus || 'Pending', 
        remarksHistory,
        createdBy: req.user?._id,
        updatedBy: req.user?._id
      });
      
      await planItem.save();
      
      // RETRO-LINKING: Find any pre-existing jobs in the same month matching criteria and link them
      if (month) {
        const jobs = await Job.find({
          dateReceived: new RegExp(`^${month}`),
          productionPlan: null
        });
        
        const matchedJobIds = [];
        jobs.forEach(job => {
          const makeMatch = (job.equipmentMake && job.equipmentMake.toLowerCase() === make.toLowerCase()) ||
                            (job.subAssemblyMake && job.subAssemblyMake.toLowerCase() === make.toLowerCase()) ||
                            (job.description && job.description.toLowerCase().includes(make.toLowerCase()));
                            
          const modelMatch = job.equipmentModel && job.equipmentModel.toLowerCase() === model.toLowerCase();
          
          const descMatch = (job.componentType && job.componentType.toLowerCase() === description.toLowerCase()) ||
                            (job.description && job.description.toLowerCase().includes(description.toLowerCase()));
                            
          const scopeMatch = job.scopeOfWork && job.scopeOfWork.toLowerCase() === scopeOfWork.toLowerCase();
          
          if (makeMatch && modelMatch && descMatch && scopeMatch) {
            matchedJobIds.push(job._id);
          }
        });
        
        if (matchedJobIds.length > 0) {
          await Job.updateMany({ _id: { $in: matchedJobIds } }, { productionPlan: planItem._id });
        }
      }
      
      res.status(201).json(ApiResponse.created(planItem, 'Production plan target created and matched successfully'));
    } catch (err) {
      next(err);
    }
  }

  /**
   * Retrieve plans for a time period and calculate real-time stage progress counts
   */
  static async getPlansForMonth(req, res, next) {
    try {
      const { financialYear, quarter, month, make, model, scopeOfWork } = req.query;
      
      const filter = {};
      if (financialYear) filter.financialYear = financialYear;
      if (quarter && quarter !== 'All') filter.quarter = quarter;
      if (month && month !== 'All') filter.month = month;
      
      if (make) filter.make = new RegExp(make, 'i');
      if (model) filter.model = new RegExp(model, 'i');
      if (scopeOfWork) filter.scopeOfWork = new RegExp(scopeOfWork, 'i');
      
      const plans = await ProductionPlan.find(filter).populate('remarksHistory.user', 'name').lean();
      const planIds = plans.map(p => p._id);
      
      // Dynamic live aggregates
      const jobs = await Job.find({ productionPlan: { $in: planIds } }).lean();
      
      const plansWithActuals = plans.map(plan => {
        const linkedJobs = jobs.filter(j => String(j.productionPlan) === String(plan._id));
        const actualCounts = {
          Received: 0,
          Inspection: 0,
          Dismantling: 0,
          Assembly: 0,
          Testing: 0,
          Dispatch: 0,
          Completed: 0
        };
        
        linkedJobs.forEach(job => {
          if (actualCounts[job.stage] !== undefined) {
            actualCounts[job.stage]++;
          }
          if (job.status === 'Completed' && job.stage !== 'Completed') {
            actualCounts.Completed++; // fallback
          }
        });
        
        // As per PRD: Actual values generated automatically from completed or dispatch stage jobs.
        const completedQty = linkedJobs.filter(j => j.stage === 'Completed' || j.status === 'Completed' || j.stage === 'Dispatch').length;
        const pendingQty = Math.max(0, plan.plannedQty - completedQty);
        const progress = plan.plannedQty > 0 ? parseFloat(((completedQty / plan.plannedQty) * 100).toFixed(1)) : 0;
        
        return {
          ...plan,
          actualCounts,
          completedQty,
          pendingQty,
          variance: completedQty - plan.plannedQty, // + is exceeded, - is behind
          progress
        };
      });
      
      res.status(200).json(ApiResponse.success('Plans retrieved successfully', plansWithActuals));
    } catch (err) {
      next(err);
    }
  }

  /**
   * Update plan item target quantity, PO status, or remarks
   */
  static async updatePlanItem(req, res, next) {
    try {
      const { id } = req.params;
      const { remark, ...otherUpdates } = req.body;
      
      const plan = await ProductionPlan.findById(id);
      if (!plan) {
        return res.status(404).json(ApiResponse.notFound('Plan target not found'));
      }

      // Apply updates
      if (otherUpdates.plannedQty !== undefined) plan.plannedQty = otherUpdates.plannedQty;
      if (otherUpdates.prPoStatus) plan.prPoStatus = otherUpdates.prPoStatus;
      plan.updatedBy = req.user?._id;

      if (remark && remark.trim() !== '') {
        plan.remarksHistory.push({
          remark: remark,
          date: new Date(),
          user: req.user?._id
        });
      }
      
      await plan.save();
      await plan.populate('remarksHistory.user', 'name');
      
      res.status(200).json(ApiResponse.success('Plan item updated successfully', plan));
    } catch (err) {
      next(err);
    }
  }

  /**
   * Delete planned target & detach linked jobs safely
   */
  static async deletePlanItem(req, res, next) {
    try {
      const { id } = req.params;
      const plan = await ProductionPlan.findByIdAndDelete(id);
      
      if (!plan) {
        return res.status(404).json(ApiResponse.notFound('Plan target not found'));
      }
      
      // Unlink all jobs referencing this plan
      await Job.updateMany({ productionPlan: id }, { productionPlan: null });
      res.status(200).json(ApiResponse.success('Plan item deleted and unlinked successfully'));
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get production planning dashboard statistics, KPIs, and chart aggregates
   */
  static async getDashboardStats(req, res, next) {
    try {
      const { financialYear, quarter, month, make, model, scopeOfWork } = req.query;
      
      const filter = {};
      if (financialYear) filter.financialYear = financialYear;
      if (quarter && quarter !== 'All') filter.quarter = quarter;
      if (month && month !== 'All') filter.month = month;
      
      if (make) filter.make = new RegExp(make, 'i');
      if (model) filter.model = new RegExp(model, 'i');
      if (scopeOfWork) filter.scopeOfWork = new RegExp(scopeOfWork, 'i');
      
      const plans = await ProductionPlan.find(filter).lean();
      const planIds = plans.map(p => p._id);
      
      const jobs = await Job.find({ productionPlan: { $in: planIds } }).lean();
      
      // KPI Calculations
      const totalPlanned = plans.reduce((acc, p) => acc + p.plannedQty, 0);
      const completedJobs = jobs.filter(j => j.stage === 'Completed' || j.status === 'Completed' || j.stage === 'Dispatch');
      const totalCompleted = completedJobs.length;
      
      const totalPending = Math.max(0, totalPlanned - totalCompleted);
      const achievement = totalPlanned > 0 ? parseFloat(((totalCompleted / totalPlanned) * 100).toFixed(1)) : 0;
      
      // Calculate delayed jobs (variance < 0 means behind plan)
      // Group completions by plan
      const planCompletions = {};
      plans.forEach(p => planCompletions[p._id] = 0);
      completedJobs.forEach(j => {
        if (planCompletions[j.productionPlan] !== undefined) {
          planCompletions[j.productionPlan]++;
        }
      });
      
      let delayedJobs = 0;
      const componentDelays = {};
      
      plans.forEach(p => {
        const comp = planCompletions[p._id] || 0;
        const variance = comp - p.plannedQty;
        if (variance < 0) {
          const delayAmt = Math.abs(variance);
          delayedJobs += delayAmt;
          
          if (!componentDelays[p.description]) componentDelays[p.description] = 0;
          componentDelays[p.description] += delayAmt;
        }
      });
      
      // Top Delayed Components
      const topDelayedComponents = Object.keys(componentDelays)
        .map(name => ({ name, count: componentDelays[name] }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      
      // ── CHART GENERATION ────────────────────────────────────
      
      // 1. Monthly/Quarterly Plan vs Actual by Component (Description)
      const descMap = {};
      plans.forEach(p => {
        const desc = p.description;
        if (!descMap[desc]) descMap[desc] = { name: desc, planned: 0, completed: 0 };
        descMap[desc].planned += p.plannedQty;
      });
      completedJobs.forEach(j => {
        const plan = plans.find(p => String(p._id) === String(j.productionPlan));
        if (plan) {
          const desc = plan.description;
          if (descMap[desc]) {
            descMap[desc].completed++;
          }
        }
      });
      const planVsActualChart = Object.values(descMap);
      
      // Component Performance Dashboard specific fields (PRD requested)
      const componentPerformance = ['Wheel Motor', 'Main Alternator', 'Grid Blower Motor', 'Control Cabinet', 'Auxiliary Inverter'].map(comp => {
        const item = descMap[comp] || { name: comp, planned: 0, completed: 0 };
        return {
          name: comp,
          planned: item.planned,
          actual: item.completed,
          pending: Math.max(0, item.planned - item.completed),
          achievement: item.planned > 0 ? parseFloat(((item.completed / item.planned) * 100).toFixed(1)) : 0
        };
      });

      // 2. Monthly Trend (if grouped by year or quarter)
      // Group by Month
      const monthMap = {};
      plans.forEach(p => {
        const m = p.month || 'Unknown';
        if (!monthMap[m]) monthMap[m] = { name: m, planned: 0, completed: 0 };
        monthMap[m].planned += p.plannedQty;
      });
      completedJobs.forEach(j => {
        const plan = plans.find(p => String(p._id) === String(j.productionPlan));
        if (plan) {
          const m = plan.month || 'Unknown';
          if (monthMap[m]) {
            monthMap[m].completed++;
          }
        }
      });
      const monthlyAchievementChart = Object.values(monthMap).sort((a,b) => a.name.localeCompare(b.name));
      
      res.status(200).json(ApiResponse.success('Dashboard statistics retrieved successfully', {
        kpis: {
          totalPlanned,
          totalCompleted,
          totalPending,
          delayedJobs,
          achievement,
          topDelayedComponents
        },
        charts: {
          planVsActualChart,
          monthlyAchievementChart,
          componentPerformance
        }
      }));
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ProductionPlanController;
