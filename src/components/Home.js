import React from 'react';
import { Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';

function Home() {
  return (
    <div className="home">
      <h1>Welcome! Which test do you want?</h1>
      <div>
        <Link to="/red">
          <Button variant="danger" size="lg" className="m-3">Red</Button>
        </Link>
        <Link to="yellow">
          <Button variant="warning" size="lg" className="m-3">Yellow</Button>
        </Link>
      </div>
    </div>
  );
}

export default Home;
