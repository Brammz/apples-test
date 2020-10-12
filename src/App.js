import React from 'react';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import AppleRed from './components/AppleRed';
import AppleYellow from './components/AppleYellow';
import Home from './components/Home';
import './App.css';

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
