
import { useContext } from 'react';
import { DataProvider, useData as useDataContext } from '../context/DataContext';

// Re-exporting for simpler access if needed, main logic is in the context file.
export const useData = useDataContext;
