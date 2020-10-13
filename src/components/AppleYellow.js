import React from 'react';
import { Button, Col, Container, Form, Modal, Row } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { sleep, shuffle } from '../utils';

const defaultSequence = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/**
 * [ ] form validation (timings)
 * [ ] random interval calculation
 */
class AppleYellow extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      testType: 'yellow',   //         |--------------------------------------------|
      gameState: 'initial', // initial -> playing -> picking -> picked -> completed -> finished
      showMenu: true,
      showSettings: false,
      practiceFeedback: false,
      showFeedback: false,
      participant: 'Name',
      nrOfTrials: 3,
      trialDuration: 10, // seconds
      nrOfFlashes: 5,
      presentationTime: 500, // milliseconds
      // https://stackoverflow.com/questions/14959200/dividing-a-number-into-random-unequal-parts
      interstimuliInterval: true, // true = equal, false = random; randomMin = presentationTime, randomMax = timeLeft
      timeBetweenFlashes: undefined,
      results: [], // [{ trial, dateISO, sequenceLength, correct, sequence, yellowApples, response }]
      currentTrial: 1,
      sequence: [],
      yellowApples: [],
      response: undefined,
      userInputEnabled: false,
      currentApple: undefined,
    };
  }

  componentDidMount() {
    document.addEventListener('keypress', (e) => {
      e.preventDefault();
      if (e.code === 'Space' && e.ctrlKey) this.setState({ showMenu: !this.state.showMenu });
      if (e.code === 'KeyQ') this.logState();
    }, false);

    this.applyToBoxes((i) => {
      document.getElementById(i).addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.setState({
          gameState: 'picking',
          response: undefined,
        });
      });
    });
  }

  /******************
   * UI INTERACTION *
   ******************/
  downloadResults = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += `Test:                       ${this.state.testType}\n`;
    csvContent += `Participant:                ${this.state.participant}\n`;
    csvContent += `Number of rounds:           ${this.state.nrOfTrials}\n`;
    csvContent += `Total duration:             ${this.state.trialDuration}\n`;
    csvContent += `Number of apples:           ${this.state.nrOfFlashes}\n`;
    csvContent += `Presentation duration:      ${this.state.presentationTime}\n`;
    csvContent += `Interval:                   ${this.state.interstimuliInterval ? 'equal' : 'random'}\n`;
    this.state.results.forEach(result => {
      csvContent += `\n`;
      csvContent += `TRIAL ${result.trial < 10 ? `${result.trial} ` : `${result.trial}`}         ${result.dateISO}\n`;
      csvContent += `--------------------------------------------------------------\n`;
      csvContent += `correct:         ${result.correct}\n`;
      csvContent += `sequence:       ${result.sequence.map(x => x < 10 ? ` ${x}` : `${x}`).join(', ')}\n`;
      csvContent += `yellow apples:  ${result.yellowApples.map(x => x < 10 ? ` ${x}` : `${x}`).join(', ')}\n`;
      csvContent += `response:       ${result.response}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('target', '_blank');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${this.state.participant}_${this.state.testType}_${new Date().toISOString()}.txt`);
    link.click();
    link.remove();
  };

  /********************
   * HELPER FUNCTIONS *
   ********************/
  logState = () => {
    Object.entries(this.state).forEach(([key, value]) => {
      console.log(`${key} :>> `, value);
    });
    console.log('');
  }

  applyToBoxes = (func) => {
    Array.from({ length: 12 }).forEach((_, i) => func(i+1));
  }

  playSequence = async () => {
    await sleep(2000);
    for (let flash of this.state.sequence) {
      this.setState({ currentApple: flash });
      await sleep(this.state.presentationTime);
      this.setState({ currentApple: undefined });
      await sleep((this.state.interstimuliInterval ? this.state.timeBetweenFlashes : this.state.timeBetweenFlashes()) * 1000);
    };
  }

  /************
   * GAMEPLAY *
   ************/
  start = async () => {
    let sequence = shuffle([...defaultSequence]).slice(0, this.state.nrOfFlashes);
    let randomPick = sequence[Math.floor(Math.random() * sequence.length)];
    let yellowApples = [randomPick];
    if (randomPick !== sequence[sequence.length-1] && Math.floor(Math.random()*2)+1 === 2) {
      yellowApples.push(sequence[sequence.length-1]);
    }
    this.setState({
      gameState: 'playing',
      timeBetweenFlashes: this.state.interstimuliInterval
        ? (this.state.trialDuration - 2 - 1 - (this.state.nrOfFlashes*this.state.presentationTime/1000)) / (this.state.nrOfFlashes - 1)
        : () => { return 5 },
      sequence: sequence,
      yellowApples: yellowApples,
    });
    await this.playSequence();
    this.setState({
      gameState: 'picking',
      userInputEnabled: true,
    });
  }

  handleBoxClick = (box) => {
    if (!this.state.userInputEnabled) return;
    this.setState({
      gameState: 'picked',
      response: box,
    });
  }

  done = () => {
    let newResults = [...this.state.results];
    let correct = (this.state.response === this.state.yellowApples[this.state.yellowApples.length-1]);
    newResults.push({
      trial: this.state.currentTrial,
      dateISO: (new Date()).toISOString(),
      sequenceLength: this.state.sequence.length,
      correct: (correct ? 'yes' : 'no'),
      sequence: [...this.state.sequence],
      yellowApples: this.state.yellowApples,
      response: this.state.response,
    });
    if (this.state.currentTrial === this.state.nrOfTrials) {
      this.setState({
        gameState: 'finished',
        showFeedback: this.state.practiceFeedback,
        results: newResults,
        sequence: [],
        yellowApples: [],
        response: undefined,
        userInputEnabled: false,
      });
      alert('Finished');
    } else {
      this.setState({
        gameState: 'completed',
        showFeedback: this.state.practiceFeedback,
        results: newResults,
        currentTrial: this.state.currentTrial+1,
        sequence: [],
        yellowApples: [],
        response: undefined,
        userInputEnabled: false,
      });
    }
  }

  getBoxClassList = (box) => {
    let classList = ['box'];
    if (box === this.state.currentApple) {
      if (this.state.yellowApples.includes(this.state.currentApple)) classList.push('apple-yellow');
      else classList.push('apple-red');
    } else if (['initial', 'playing', 'completed', 'finished'].includes(this.state.gameState)) {
      classList.push('box-disabled');
    } else {
      if (this.state.response === box) classList.push('box-picked');
      else classList.push('box-pickable');
    }
    return classList.join(' ');
  }

  render() {
    const settingsEnabled = (this.state.gameState === 'initial');
    const startEnabled = (this.state.gameState === 'initial' || this.state.gameState === 'completed');
    const doneEnabled = (this.state.gameState === 'picked');
    return (
      <>
        <Modal id="settingsModal" show={this.state.showSettings} onHide={() => this.setState({ showSettings: false })} size="md">
            <Modal.Header closeButton>
              <Modal.Title>Settings</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Form>
                <Form.Group as={Row} controlId="participant">
                  <Form.Label column sm={5}>Participant</Form.Label>
                  <Col sm={7}>
                    <Form.Control type="text" value={this.state.participant} onChange={(e) => this.setState({ participant: e.target.value })} />
                  </Col>
                </Form.Group>
                <Form.Group as={Row} controlId="nrOfTrials">
                  <Form.Label column sm={5}>Number of trials</Form.Label>
                  <Col sm={7}>
                    <Form.Control type="number" value={this.state.nrOfTrials} onChange={(e) => this.setState({ nrOfTrials: Math.max(1, +e.target.value) })} />
                  </Col>
                </Form.Group>
                <Form.Group as={Row} controlId="trialDuration">
                  <Form.Label column sm={5}>Trial duration (s)</Form.Label>
                  <Col sm={7}>
                    <Form.Control type="number" value={this.state.trialDuration} onChange={(e) => this.setState({ trialDuration: Math.max(4, +e.target.value) })} />
                  </Col>
                </Form.Group>
                <Form.Group as={Row} controlId="nrOfFlashes">
                  <Form.Label column sm={5}>Number of apples</Form.Label>
                  <Col sm={7}>
                    <Form.Control type="number" value={this.state.nrOfFlashes} onChange={(e) => this.setState({ nrOfFlashes: Math.min(12, Math.max(1, +e.target.value)) })} />
                  </Col>
                </Form.Group>
                <Form.Group as={Row} controlId="presentationTime">
                  <Form.Label column sm={5}>Presentation time (ms)</Form.Label>
                  <Col sm={7}>
                    <Form.Control type="number" min="500" value={this.state.presentationTime} onChange={(e) => this.setState({ presentationTime: Math.max(500, +e.target.value) })} />
                  </Col>
                </Form.Group>
                <fieldset>
                  <Form.Group as={Row}>
                    <Form.Label as="legend" column sm={5}>Interstimuli interval</Form.Label>
                    <Col sm={7}>
                      <Form.Check type="radio" name="interstimuliInterval" id="equal" label="Equal" checked={this.state.interstimuliInterval} onChange={(e) => this.setState({ interstimuliInterval: true })} />
                      <Form.Check type="radio" name="interstimuliInterval" id="random" label="Random" checked={!this.state.interstimuliInterval} onChange={(e) => this.setState({ interstimuliInterval: false })} />
                    </Col>
                  </Form.Group>
                </fieldset>
                <Form.Group as={Row} controlId="practiceFeedback">
                  <Form.Label as="legend" column sm={5}>Practice</Form.Label>
                  <Col sm={7} className="p-2 pl-3">
                    <Form.Check type="checkbox" id="feedback" label="Feedback" checked={this.state.practiceFeedback} onChange={(e) =>  this.setState({ practiceFeedback: e.target.checked })} />
                  </Col>
                </Form.Group>
              </Form>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => this.setState({ showSettings: false })}>Close</Button>
            </Modal.Footer>
        </Modal>
        <Modal id="feedbackModal" show={this.state.showFeedback} onHide={() => this.setState({ showFeedback: false })} size="md">
            <Modal.Header closeButton>
              <Modal.Title>Feedback</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {this.state.results.map((r, i) => (
                <div key={i}>
                  <Row>
                    <Col sm="4">Trial</Col>
                    <Col sm="8">{r.trial}</Col>
                  </Row>
                  <Row>
                    <Col sm="4">Correct</Col>
                    <Col sm="8">{r.correct}</Col>
                  </Row>
                  <Row>
                    <Col sm="4">Sequence</Col>
                    <Col sm="8">{r.sequence.map(x => x < 10 ? ` ${x}` : `${x}`).join(', ')}</Col>
                  </Row>
                  <Row>
                    <Col sm="4">Yellow apple</Col>
                    <Col sm="8">{r.yellowApples[r.yellowApples.length-1]}</Col>
                  </Row>
                  <Row>
                    <Col sm="4">Response</Col>
                    <Col sm="8">{r.response}</Col>
                  </Row>
                  {i !== this.state.results.length-1 && (<><br /><br /></>)}
                </div>
              ))}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => this.setState({ showFeedback: false })}>Close</Button>
            </Modal.Footer>
        </Modal>
        {this.state.showMenu && (
          <div className="menu">
            <div className="actions-btn-group">
              <Link to="/">
                <Button variant="secondary" className="mb-2">
                  <img src="/icons/home.svg" alt="" title="Home" />
                </Button>
              </Link><br />
              <Button onClick={() => this.setState({ showSettings: true })} disabled={!settingsEnabled} variant="secondary" className="mb-2">
                <img src="/icons/gear.svg" alt="" title="Settings" />
              </Button><br />
              <Button onClick={this.downloadResults} variant="secondary" className="mb-2">
                <img src="/icons/download.svg" alt="" title="Download" />
              </Button><br />
              <Button onClick={this.start} disabled={!startEnabled} variant="secondary" className="mb-2">
                <img src="/icons/play.svg" alt="" title="Start" />
              </Button><br />
              <Button onClick={this.done} disabled={!doneEnabled} variant="secondary" className="mb-2">
                <img src="/icons/check.svg" alt="" title="Done" />
              </Button><br />
              <Button variant={this.state.gameState === 'finished' ? 'success' : 'outline-dark'} disabled className="mb-2 btn-fat" style={{ width: '50px', height: '39px' }}><b>{this.state.gameState === 'finished' ? 'F' : `T${this.state.currentTrial}`}</b></Button><br />
              {this.state.practiceFeedback && (<><Button variant="info" disabled className="mb-2 btn-fat" style={{ width: '50px', height: '39px' }}><b>P</b></Button><br /></>)}
            </div>
          </div>
        )}
        <Container className="container-height">
          <Row className="rows-6">
            <Col className="img-container">
              <img src="/images/house_blue.png" alt="blueHouse" />
            </Col>
            <Col className="img-container">
              <img src="/images/car_blue.png" alt="blueCar" />
            </Col>
            <Col className="img-container">
              <img src="/images/train_blue.png" alt="blueTrain" />
            </Col>
            <Col className="img-container">
              <img src="/images/boat_blue.png" alt="blueBoat" />
            </Col>
          </Row>
          <Row className="rows-6">
            <Col className="box-container">
              <div id="1" onClick={() => this.handleBoxClick(1)} className={this.getBoxClassList(1)}>{this.state.response === 1 && 'X'}</div>
            </Col>
            <Col className="box-container">
              <div id="2" onClick={() => this.handleBoxClick(2)} className={this.getBoxClassList(2)}>{this.state.response === 2 && 'X'}</div>
            </Col>
            <Col className="box-container">
              <div id="3" onClick={() => this.handleBoxClick(3)} className={this.getBoxClassList(3)}>{this.state.response === 3 && 'X'}</div>
            </Col>
            <Col className="box-container">
              <div id="4" onClick={() => this.handleBoxClick(4)} className={this.getBoxClassList(4)}>{this.state.response === 4 && 'X'}</div>
            </Col>
          </Row>
          <Row className="rows-6">
            <Col className="img-container">
              <img src="/images/house_green.png" alt="greenHouse" />
            </Col>
            <Col className="img-container">
              <img src="/images/car_green.png" alt="greenCar" />
            </Col>
            <Col className="img-container">
              <img src="/images/train_green.png" alt="greenTrain" />
            </Col>
            <Col className="img-container">
              <img src="/images/boat_green.png" alt="greenBoat" />
            </Col>
          </Row>
          <Row className="rows-6">
            <Col className="box-container">
              <div id="5" onClick={() => this.handleBoxClick(5)} className={this.getBoxClassList(5)}>{this.state.response === 5 && 'X'}</div>
            </Col>
            <Col className="box-container">
              <div id="6" onClick={() => this.handleBoxClick(6)} className={this.getBoxClassList(6)}>{this.state.response === 6 && 'X'}</div>
            </Col>
            <Col className="box-container">
              <div id="7" onClick={() => this.handleBoxClick(7)} className={this.getBoxClassList(7)}>{this.state.response === 7 && 'X'}</div>
            </Col>
            <Col className="box-container">
              <div id="8" onClick={() => this.handleBoxClick(8)} className={this.getBoxClassList(8)}>{this.state.response === 8 && 'X'}</div>
            </Col>
          </Row>
          <Row className="rows-6">
            <Col className="img-container">
              <img src="/images/house_black.png" alt="blackHouse" />
            </Col>
            <Col className="img-container">
              <img src="/images/car_black.png" alt="blackCar" />
            </Col>
            <Col className="img-container">
              <img src="/images/train_black.png" alt="blackTrain" />
            </Col>
            <Col className="img-container">
              <img src="/images/boat_black.png" alt="blackBoat" />
            </Col>
          </Row>
          <Row className="rows-6">
            <Col className="box-container">
              <div id="9" onClick={() => this.handleBoxClick(9)} className={this.getBoxClassList(9)}>{this.state.response === 9 && 'X'}</div>
            </Col>
            <Col className="box-container">
              <div id="10" onClick={() => this.handleBoxClick(10)} className={this.getBoxClassList(10)}>{this.state.response === 10 && 'X'}</div>
            </Col>
            <Col className="box-container">
              <div id="11" onClick={() => this.handleBoxClick(11)} className={this.getBoxClassList(11)}>{this.state.response === 11 && 'X'}</div>
            </Col>
            <Col className="box-container">
              <div id="12" onClick={() => this.handleBoxClick(12)} className={this.getBoxClassList(12)}>{this.state.response === 12 && 'X'}</div>
            </Col>
          </Row>
        </Container>
      </>
    );
  }
}

export default AppleYellow;
