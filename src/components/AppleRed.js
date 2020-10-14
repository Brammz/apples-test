import React from 'react';
import { Button, Col, Container, Form, Modal, Row } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { sleep, shuffle } from '../utils';
import { ReactComponent as Home } from '../assets/icons/home.svg';
import { ReactComponent as Gear } from '../assets/icons/gear.svg';
import { ReactComponent as Download } from '../assets/icons/download.svg';
import { ReactComponent as Play } from '../assets/icons/play.svg';
import { ReactComponent as Check } from '../assets/icons/check.svg';
import blueHouse from '../assets/images/blue_house.png';
import blueCar from '../assets/images/blue_car.png';
import blueTrain from '../assets/images/blue_train.png';
import blueBoat from '../assets/images/blue_boat.png';
import greenHouse from '../assets/images/green_house.png';
import greenCar from '../assets/images/green_car.png';
import greenTrain from '../assets/images/green_train.png';
import greenBoat from '../assets/images/green_boat.png';
import blackHouse from '../assets/images/black_house.png';
import blackCar from '../assets/images/black_car.png';
import blackTrain from '../assets/images/black_train.png';
import blackBoat from '../assets/images/black_boat.png';

const defaultSequence = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

class AppleRed extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      testType: 'red',      //         |--------------------------------------------|
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
      results: [], // [{ trial, dateISO, sequenceLength, correct, wrong, score, sequence, responseSequence }]
      currentTrial: 1,
      sequence: [],
      responseSequence: [],
      userInputEnabled: false,
      currentApple: undefined,
      pickOrder: undefined,
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
        if (this.state.responseSequence.includes(i)) {
          let newResponseSequence = [...this.state.responseSequence];
          let index = newResponseSequence.indexOf(i);
          newResponseSequence[index] = undefined;
          this.setState({
            gameState: 'picking',
            responseSequence: newResponseSequence,
          });
          this.setPickOrder(index+1);
        }
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
      csvContent += `incorrect:       ${result.incorrect}\n`;
      csvContent += `score:           ${result.score}\n`;
      csvContent += `sequence:       ${result.sequence.map(x => x < 10 ? ` ${x}` : `${x}`).join(', ')}\n`;
      csvContent += `response:       ${result.responseSequence.map(x => x < 10 ? ` ${x}` : `${x}`).join(', ')}\n`;
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

  setPickOrder(i) {
    if (i > this.state.sequence.length) return;
    this.setState({ pickOrder: i });
  }

  getScore = (seq, res) => {
    const a = [0, ...seq, 13];
    const b = [0, ...res, 13];
    const c = Array.from({ length: a.length }).fill(0);
    for(let i = 1; i < b.length-1; i++) {
      if (b[i] === a[i]) {
        c[i] = 3;
      } else {
        let foundIndex = a.indexOf(b[i]);
        if (foundIndex !== -1) {
          c[i] = 1;
          if (b[i-1] === a[foundIndex-1] && b[i+1] === a[foundIndex+1]) {
            c[i] = c[i] + 2;
          } else if (b[i-1] === a[foundIndex-1] || b[i+1] === a[foundIndex+1]) {
            c[i] = c[i] + 1;
          }
        } else {
          c[i] = 0;
        }
      }
    }
    return +(c.reduce((a, b) => a + b, 0) / (3 * seq.length) * 100).toFixed(1);
  }

  /************
   * GAMEPLAY *
   ************/
  start = async () => {
    this.setState({
      gameState: 'playing',
      timeBetweenFlashes: this.state.interstimuliInterval
        ? (this.state.trialDuration - 2 - 1 - (this.state.nrOfFlashes*this.state.presentationTime/1000)) / (this.state.nrOfFlashes - 1)
        : () => { return 5 },
      sequence: shuffle([...defaultSequence]).slice(0, this.state.nrOfFlashes),
      responseSequence: Array.from({ length: this.state.nrOfFlashes }),
    });
    await this.playSequence();
    this.setState({
      gameState: 'picking',
      pickOrder: 1,
      userInputEnabled: true,
    });
  }

  handleBoxClick = (box) => {
    if (!this.state.userInputEnabled) return;

    let newResponseSequence = [...this.state.responseSequence];
    let newPickOrder = this.state.pickOrder;

    // pick order already exists (index in response is occupied)
    if (newResponseSequence[this.state.pickOrder-1]) newResponseSequence[this.state.pickOrder-1] = undefined;

    // box already has a pick order (response includes boxid)
    if (newResponseSequence.includes(box)) newResponseSequence[newResponseSequence.indexOf(box)] = undefined;

    newResponseSequence[this.state.pickOrder-1] = box;
    this.setState({ responseSequence: newResponseSequence });

    if (newResponseSequence[this.state.pickOrder] || this.state.pickOrder+1 > this.state.sequence.length) newPickOrder = newResponseSequence.indexOf(undefined);
    if (newPickOrder === -1) this.setPickOrder({ pickOrder: undefined });
    else this.setPickOrder(newPickOrder+1);

    if (newResponseSequence.filter(g => !!g).length === this.state.sequence.length) this.setState({ gameState: 'picked' });
  }

  done = () => {
    let newResults = [...this.state.results];
    let correct = 0;
    let incorrect = 0;
    this.state.responseSequence.forEach((guess, i) => {
      if (this.state.sequence[i] === guess) correct++;
      else incorrect++;
    });
    newResults.push({
      trial: this.state.currentTrial,
      dateISO: (new Date()).toISOString(),
      sequenceLength: this.state.sequence.length,
      correct,
      incorrect,
      score: this.getScore([...this.state.sequence], [...this.state.responseSequence]),
      sequence: [...this.state.sequence],
      responseSequence: [...this.state.responseSequence],
    });
    if (this.state.currentTrial === this.state.nrOfTrials) {
      this.setState({
        gameState: 'finished',
        showFeedback: this.state.practiceFeedback,
        results: newResults,
        sequence: [],
        responseSequence: [],
        userInputEnabled: false,
        pickOrder: undefined,
      });
      alert('Finished');
    } else {
      this.setState({
        gameState: 'completed',
        showFeedback: this.state.practiceFeedback,
        results: newResults,
        currentTrial: this.state.currentTrial+1,
        sequence: [],
        responseSequence: [],
        userInputEnabled: false,
        pickOrder: undefined,
      });
    }
  }

  getBoxClassList = (box) => {
    let classList = ['box'];
    if (box === this.state.currentApple) {
      classList.push('red-apple');
    } else if (['initial', 'playing', 'completed', 'finished'].includes(this.state.gameState)) {
      classList.push('box-disabled');
    } else {
      if (this.state.responseSequence.includes(box)) classList.push('box-picked');
      else classList.push('box-pickable');
    }
    return classList.join(' ');
  }

  getPickOrderVariant = (pickOrder) => {
    const active = (this.state.pickOrder === pickOrder);
    const picked = (!!this.state.responseSequence[pickOrder-1]);
    if (active && picked) return 'primary';
    else if (active && !picked) return 'outline-primary';
    else if (!active && picked) return 'secondary';
    else return 'outline-secondary';
  }

  render() {
    const startEnabled = (this.state.gameState === 'initial' || this.state.gameState === 'completed');
    const doneEnabled = (this.state.gameState === 'picked');
    const response = this.state.responseSequence;
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
                    <Form.Control type="text" value={this.state.participant} autoComplete="off" onChange={(e) => { this.setState({ participant: e.target.value }) }} />
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
                    <Form.Control type="number" value={this.state.presentationTime} onChange={(e) => this.setState({ presentationTime: Math.max(500, +e.target.value) })} />
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
                    <Col sm="4">Incorrect</Col>
                    <Col sm="8">{r.incorrect}</Col>
                  </Row>
                  <Row>
                    <Col sm="4">Score</Col>
                    <Col sm="8">{r.score}</Col>
                  </Row>
                  <Row>
                    <Col sm="4">Sequence</Col>
                    <Col sm="8">{r.sequence.map(x => x < 10 ? ` ${x}` : `${x}`).join(', ')}</Col>
                  </Row>
                  <Row>
                    <Col sm="4">Response</Col>
                    <Col sm="8">{r.responseSequence.map(x => x < 10 ? ` ${x}` : `${x}`).join(', ')}</Col>
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
                  <Home alt="" title="Home" />
                </Button>
              </Link><br />
              <Button onClick={() => this.setState({ showSettings: true })} variant="secondary" className="mb-2">
                <Gear alt="" title="Settings" />
              </Button><br />
              <Button onClick={this.downloadResults} variant="secondary" className="mb-2">
                <Download alt="" title="Download" />
              </Button><br />
              <Button onClick={this.start} disabled={!startEnabled} variant="secondary" className="mb-2">
                <Play alt="" title="Start" />
              </Button><br />
              <Button onClick={this.done} disabled={!doneEnabled} variant="secondary" className="mb-2">
                <Check alt="" title="Done" />
              </Button><br />
              <Button variant={this.state.gameState === 'finished' ? 'success' : 'outline-dark'} disabled className="mb-2 btn-fat" style={{ width: '50px', height: '39px' }}><b>{this.state.gameState === 'finished' ? 'F' : `T${this.state.currentTrial}`}</b></Button><br />
              {this.state.practiceFeedback && (<><Button variant="info" disabled className="mb-2 btn-fat" style={{ width: '50px', height: '39px' }}><b>P</b></Button><br /></>)}
            </div>
            <div className="pickorder-btn-group">
              {Array.from({ length: this.state.nrOfFlashes }).map((_, i) => (
                <div key={i+1}>
                  <Button onClick={() => this.setPickOrder(i+1)} variant={this.getPickOrderVariant(i+1)} className="mb-2 btn-fat" style={{ width: '50px', height: '39px' }}><b>{i+1}</b></Button><br />
                </div>
              ))}
            </div>
          </div>
        )}
        <Container className="container-height">
          <Row className="rows-6">
            <Col className="img-container">
              <img src={blueHouse} alt="blueHouse" />
            </Col>
            <Col className="img-container">
              <img src={blueCar} alt="blueCar" />
            </Col>
            <Col className="img-container">
              <img src={blueTrain} alt="blueTrain" />
            </Col>
            <Col className="img-container">
              <img src={blueBoat} alt="blueBoat" />
            </Col>
          </Row>
          <Row className="rows-6">
            <Col className="box-container">
              <div id="1" onClick={() => this.handleBoxClick(1)} className={this.getBoxClassList(1)}>{response.indexOf(1) !== -1 && (response.indexOf(1) + 1)}</div>
            </Col>
            <Col className="box-container">
              <div id="2" onClick={() => this.handleBoxClick(2)} className={this.getBoxClassList(2)}>{response.indexOf(2) !== -1 && (response.indexOf(2) + 1)}</div>
            </Col>
            <Col className="box-container">
              <div id="3" onClick={() => this.handleBoxClick(3)} className={this.getBoxClassList(3)}>{response.indexOf(3) !== -1 && (response.indexOf(3) + 1)}</div>
            </Col>
            <Col className="box-container">
              <div id="4" onClick={() => this.handleBoxClick(4)} className={this.getBoxClassList(4)}>{response.indexOf(4) !== -1 && (response.indexOf(4) + 1)}</div>
            </Col>
          </Row>
          <Row className="rows-6">
            <Col className="img-container">
              <img src={greenHouse} alt="greenHouse" />
            </Col>
            <Col className="img-container">
              <img src={greenCar} alt="greenCar" />
            </Col>
            <Col className="img-container">
              <img src={greenTrain} alt="greenTrain" />
            </Col>
            <Col className="img-container">
              <img src={greenBoat} alt="greenBoat" />
            </Col>
          </Row>
          <Row className="rows-6">
            <Col className="box-container">
              <div id="5" onClick={() => this.handleBoxClick(5)} className={this.getBoxClassList(5)}>{response.indexOf(5) !== -1 && (response.indexOf(5) + 1)}</div>
            </Col>
            <Col className="box-container">
              <div id="6" onClick={() => this.handleBoxClick(6)} className={this.getBoxClassList(6)}>{response.indexOf(6) !== -1 && (response.indexOf(6) + 1)}</div>
            </Col>
            <Col className="box-container">
              <div id="7" onClick={() => this.handleBoxClick(7)} className={this.getBoxClassList(7)}>{response.indexOf(7) !== -1 && (response.indexOf(7) + 1)}</div>
            </Col>
            <Col className="box-container">
              <div id="8" onClick={() => this.handleBoxClick(8)} className={this.getBoxClassList(8)}>{response.indexOf(8) !== -1 && (response.indexOf(8) + 1)}</div>
            </Col>
          </Row>
          <Row className="rows-6">
            <Col className="img-container">
              <img src={blackHouse} alt="blackHouse" />
            </Col>
            <Col className="img-container">
              <img src={blackCar} alt="blackCar" />
            </Col>
            <Col className="img-container">
              <img src={blackTrain} alt="blackTrain" />
            </Col>
            <Col className="img-container">
              <img src={blackBoat} alt="blackBoat" />
            </Col>
          </Row>
          <Row className="rows-6">
            <Col className="box-container">
              <div id="9" onClick={() => this.handleBoxClick(9)} className={this.getBoxClassList(9)}>{response.indexOf(9) !== -1 && (response.indexOf(9) + 1)}</div>
            </Col>
            <Col className="box-container">
              <div id="10" onClick={() => this.handleBoxClick(10)} className={this.getBoxClassList(10)}>{response.indexOf(10) !== -1 && (response.indexOf(10) + 1)}</div>
            </Col>
            <Col className="box-container">
              <div id="11" onClick={() => this.handleBoxClick(11)} className={this.getBoxClassList(11)}>{response.indexOf(11) !== -1 && (response.indexOf(11) + 1)}</div>
            </Col>
            <Col className="box-container">
              <div id="12" onClick={() => this.handleBoxClick(12)} className={this.getBoxClassList(12)}>{response.indexOf(12) !== -1 && (response.indexOf(12) + 1)}</div>
            </Col>
          </Row>
        </Container>
      </>
    );
  }
}

export default AppleRed;
