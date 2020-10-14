import React from 'react';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import AppleRed from './components/AppleRed';
import AppleYellow from './components/AppleYellow';
import Home from './components/Home';
import './App.css';

/**
 * [ ] form validation (trial duration: adjust + message)
 * [ ] random interval calculation
 * [ ] scoring algorithm
 * [ ] replace numbers in feedback screen with acronyms
 * [ ] no spacing in sequences on download
 * [ ] show menu when hovering?
 */
function App() {
  return (
    <div className="App">
      <Router>
        <Switch>
          <Route path="/red">
            <AppleRed />
          </Route>
          <Route path="/yellow">
            <AppleYellow />
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
