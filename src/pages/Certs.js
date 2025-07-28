// frontend/src/pages/Certs.js
import React from 'react';

const Certs = () => {
  return (
    <div>
      <h1 className="page-header">SSL/TLS Certificates</h1>
      <p>Manage your certificates for secure connections.</p>
       <div className="card">
        <h3>Issue Certificate (Let's Encrypt)</h3>
        <p>Functionality to issue certificates using the Cloudflare DNS challenge would be built here.</p>
      </div>
    </div>
  );
};

export default Certs;