import { create } from 'zustand';
import api from '../utils/api';

const useJobStore = create((set, get) => ({
  jobData: null,
  loading: false,
  saving: false,
  error: null,
  activeJobId: null,

  // Fetch all stage data for a job
  fetchJobData: async (jobId) => {
    if (!jobId) return;
    set({ loading: true, error: null, activeJobId: jobId });
    try {
      const { data } = await api.get(`/templates/jobdata/${jobId}`);
      set({ jobData: data, loading: false });
    } catch (err) {
      console.error('Failed to load job data', err);
      set({ error: 'Failed to load job data', loading: false, jobData: {} });
    }
  },

  // Update a specific stage's data locally
  setStageData: (stageNum, updateFnOrData) => {
    set((state) => {
      if (!state.jobData) return state;
      const currentStageData = state.jobData[`stage${stageNum}`] || {};
      const newStageData = typeof updateFnOrData === 'function' 
        ? updateFnOrData(currentStageData) 
        : updateFnOrData;

      return {
        jobData: {
          ...state.jobData,
          [`stage${stageNum}`]: newStageData
        }
      };
    });
  },

  // Save a specific stage to the backend
  saveStageData: async (stageNum, overrideData) => {
    const { activeJobId, jobData } = get();
    if (!activeJobId) return;

    const payload = overrideData || (jobData ? jobData[`stage${stageNum}`] : null);
    if (!payload) return;

    set({ saving: true });
    try {
      await api.put(`/templates/jobdata/${activeJobId}/stage/${stageNum}`, payload);
      // Optional: re-fetch or rely on local state update
    } catch (err) {
      console.error(`Failed to save stage ${stageNum}`, err);
      throw err;
    } finally {
      set({ saving: false });
    }
  },

  // Clear store
  clearJobData: () => set({ jobData: null, activeJobId: null, error: null })
}));

export default useJobStore;
