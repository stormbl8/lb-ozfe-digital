import React from 'react';

const WAFRules = () => {
  return (
    <div>
      <h1 className="page-header">Web Application Firewall (WAF)</h1>
      <p>Protect your services from common web exploits like SQL injection and cross-site scripting.</p>
      
      <div className="card">
        <h3>OWASP Core Rule Set</h3>
        <p>This is where you would enable and configure the industry-standard OWASP rules.</p>
        <button disabled>Enable ModSecurity (Coming Soon)</button>
      </div>

      <div className="card">
        <h3>Custom IP Filters</h3>
        <p>Create lists to explicitly allow or deny traffic from certain IP addresses or ranges.</p>
        <button disabled>Add IP List (Coming Soon)</button>
      </div>
    </div>
  );
};

export default WAFRules;