import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster, toast, ToastBar } from 'react-hot-toast';
import App from './App.jsx';
import './index.css';
import 'flag-icons/css/flag-icons.min.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#1a1614', color: '#fff', border: '1px solid rgba(255,255,255,0.08)' },
        }}
      >
        {(t) => (
          <div onClick={() => toast.dismiss(t.id)} style={{ cursor: 'pointer' }}>
            <ToastBar toast={t} />
          </div>
        )}
      </Toaster>
    </BrowserRouter>
  </React.StrictMode>,
);
