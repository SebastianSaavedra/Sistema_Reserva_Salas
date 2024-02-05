import { configureStore } from '@reduxjs/toolkit';
import oficinaReducer from './slices/oficinaSlice';

const store = configureStore({
  reducer: {
    oficina: oficinaReducer,
  },
});
export default store;