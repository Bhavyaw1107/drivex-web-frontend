import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { ClerkProvider } from '@clerk/clerk-react';
import { BrowserRouter } from 'react-router-dom';

const clerkPubKey = pk_test_ZnVubnktbGVvcGFyZC04Mi5jbGVyay5hY2NvdW50cy5kZXYk;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={clerkPubKey}>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <App />
      </BrowserRouter>
    </ClerkProvider>
  </React.StrictMode>
);
