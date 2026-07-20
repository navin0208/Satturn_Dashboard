import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import './Layout.css';

const DashboardLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="layout-container">
      {isMobileMenuOpen && (
        <div 
          className="mobile-overlay active" 
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}
      <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      <div className="main-wrapper">
        <Topbar onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />
        <main className="content-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
