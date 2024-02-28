import { createSlice } from '@reduxjs/toolkit';

const officeSlice = createSlice({
  name: 'office',
  initialState: {
    oficinas: null,
    officeId: null,
  },
  reducers: {
    saveOfficesData: (state, action) => {
      state.oficinas = action.payload;
    },
    setOfficeId: (state, action) => {
      state.officeId = action.payload;
    },
  },
});

export const { setOfficeId } = officeSlice.actions;
export const getOfficeId = (state) => state.oficina.officeId;
export const { saveOfficesData } = officeSlice.actions;
export const getAllOffices = (state) => state.oficina.oficinas;

export default officeSlice.reducer;
