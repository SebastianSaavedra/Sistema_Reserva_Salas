import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { saveOfficesData } from '../slices/oficinaSlice';

const InitializeData = ({ children }) => {
  const dispatch = useDispatch();

  useEffect(() => {
    const oficinas_data = [
      { nombre: "Florida Center", oficina_id: "florida_center" },
      { nombre: "Alto Las Condes", oficina_id: "alto_las_condes" }
    ];
    dispatch(saveOfficesData(oficinas_data));
  }, [dispatch]);

  return children;
};

export default InitializeData;
