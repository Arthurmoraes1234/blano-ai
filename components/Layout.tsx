import React from 'react';
import { Outlet } from 'react-router-dom';
import BottomNavBar from './Sidebar';
import ToastContainer from './ToastContainer';

const DashboardLayout: React.FC = () => {
  return (
    <div className="text-white min-h-screen">
      <main className="pb-28 sm:pb-32">
        <Outlet />
      </main>
      <ToastContainer />
      <BottomNavBar />
    </div>
  );
};

export default DashboardLayout;