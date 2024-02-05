import { createSlice } from '@reduxjs/toolkit';
// import api from '../Api';

const oficceSlice = createSlice({
  name: 'office',
  initialState: {
    oficinas: null,
    selectedOfficeId: null,
  },
  reducers: {
    saveOffices: (state, action) => {
      state.oficinas = action.payload;
    },
    selectOfficeId: (state, action) => {
      state.selectedOfficeId = action.payload;
    },
  },
});

export const { selectOfficeId } = oficceSlice.actions;
export const getOfficeId = (state) => state.oficina.selectedOfficeId;
export const { saveOffices } = oficceSlice.actions;
export const getAllOffices = (state) => state.oficina.oficinas;

export default oficceSlice.reducer;
