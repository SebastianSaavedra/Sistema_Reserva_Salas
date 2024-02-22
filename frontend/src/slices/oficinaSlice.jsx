import { createSlice } from '@reduxjs/toolkit';

const officeSlice = createSlice({
  name: 'office',
  initialState: {
    oficinas: null,
    selectedOfficeId: null,
  },
  reducers: {
    saveOfficesData: (state, action) => {
      state.oficinas = action.payload;
    },
    selectOfficeId: (state, action) => {
      state.selectedOfficeId = action.payload;
    },
  },
});

export const { selectOfficeId } = officeSlice.actions;
export const getOfficeId = (state) => state.oficina.selectedOfficeId;
export const { saveOfficesData } = officeSlice.actions;
export const getAllOffices = (state) => state.oficina.oficinas;

export default officeSlice.reducer;
