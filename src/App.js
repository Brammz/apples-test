import React from 'react';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import AppleRed from './components/AppleRed';
import AppleYellow from './components/AppleYellow';
import Home from './components/Home';
import './App.css';

/**
 * [ ] random interval calculation
 * [ ] show menu when hovering?
 */
function App() {
  const boxMapping = {
    1: 'BH',
    2: 'BA',
    3: 'BT',
    4: 'BB',
    5: 'GH',
    6: 'GA',
    7: 'GT',
    8: 'GB',
    9: 'ZH',
    10: 'ZA',
    11: 'ZT',
    12: 'ZB',
  };

  return (
    <div className="App">
      <Router>
        <Switch>
          <Route path="/red">
            <AppleRed boxMapping={boxMapping} />
          </Route>
          <Route path="/yellow">
            <AppleYellow boxMapping={boxMapping} />
          </Route>
          <Route path="/">
            <Home />
          </Route>
        </Switch>
      </Router>
    </div>
  );
}

export default App;
