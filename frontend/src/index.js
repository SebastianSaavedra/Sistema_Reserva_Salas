import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import InitializeData from './components/InitializeData';
import App from './App';
import './App.css';
import reportWebVitals from './reportWebVitals';
import store from './store';
import { Provider} from 'react-redux';
import 'bootstrap/dist/css/bootstrap.min.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <InitializeData>
        <App />
      </InitializeData>
    </Provider>
  </React.StrictMode>
);
reportWebVitals();