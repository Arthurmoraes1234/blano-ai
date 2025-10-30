
import { useContext } from 'react';
import { AuthProvider, useAuth as useAuthContext } from '../context/AuthContext';

// Re-exporting for simpler access if needed, main logic is in the context file.
export const useAuth = useAuthContext;
