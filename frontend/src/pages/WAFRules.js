import React from 'react';

const WAFRules = () => {
  return (
    <div>
      <h1 className="page-header">Web Application Firewall (WAF)</h1>
      <p>This system uses ModSecurity with the OWASP Core Rule Set (CRS) for protection.</p>
      
      <div className="card">
        <h3>How It Works</h3>
        <p>
            The WAF can be enabled on a per-service basis when you add a new reverse proxy.
            When enabled, it uses the default rules provided by the OWASP Core Rule Set to protect your application against common threats like:
        </p>
        <ul>
            <li>SQL Injection (SQLi)</li>
            <li>Cross-Site Scripting (XSS)</li>
            <li>Local File Inclusion (LFI)</li>
            <li>And many other common web attacks.</li>
        </ul>
        <p>
            Advanced management of individual rules is not yet available through the UI. Customizations can be made by modifying the NGINX container's rulesets directly.
        </p>
      </div>
    </div>
  );
};

export default WAFRules;