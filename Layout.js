import React from 'react';
import { NavLink } from 'react-router-dom';

const Layout = ({ children }) => {
  return (
    <div className="layout">
      <aside className="sidebar">
        <h2>LoadBalancer</h2>
        <nav>
          <ul>
            <li><NavLink to="/">Dashboard</NavLink></li>
            <li><NavLink to="/services">Services</NavLink></li>
            <li><NavLink to="/certs">Certificates</NavLink></li>
            <li><NavLink to="/waf">WAF Rules</NavLink></li>
            <li><NavLink to="/logs">Logs</NavLink></li>
            <li><NavLink to="/settings">Settings</NavLink></li>
          </ul>
        </nav>
      </aside>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default Layout;