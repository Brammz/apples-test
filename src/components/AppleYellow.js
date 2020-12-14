import React from 'react';
import { Button, Col, Form, Modal, OverlayTrigger, Popover, Row } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { sleep, shuffle } from '../utils';
import { ReactComponent as Home } from '../assets/icons/home.svg';
import { ReactComponent as Gear } from '../assets/icons/gear.svg';
import { ReactComponent as Download } from '../assets/icons/download.svg';
import { ReactComponent as Play } from '../assets/icons/play.svg';
import { ReactComponent as Check } from '../assets/icons/check.svg';
import { ReactComponent as Question } from '../assets/icons/question.svg';
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
      nrOfFlashes: 5,
      presentationTime: 500, // milliseconds
      trialDuration: 10, // seconds
      trialDurationMin: 10, // minimum trial duration for nrOfFlashes and presentationTime
      trialDurationError: false, // error shown when trialDuration is under minimum
      interstimuliInterval: true, // true = equal, false = random; randomMin = presentationTime, randomMax = timeLeft
      timeBetweenFlashes: undefined,
      results: [], // [{ trial, dateISO, sequenceLength, correct, sequence, yellowApples, response }]
      currentTrial: 1,
      sequenceTimings: [],
      sequence: [],
      yellowApples: [],
      response: undefined,
      userInputEnabled: false,
      currentApple: undefined,
    };
  }

  componentDidMount() {
    document.addEventListener('keypress', (e) => {
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
  updateSetting = (e) => {
    if (e.target.id === 'participant') {
      this.setState({ [e.target.id]: e.target.value });
    } else if (e.target.id === 'nrOfTrials') {
      this.setState({ nrOfTrials: Math.max(1, +e.target.value) });
    } else if (e.target.id === 'nrOfFlashes' || e.target.id === 'presentationTime' || e.target.id === 'trialDuration') {
      const flashes = (e.target.id === 'nrOfFlashes' ? Math.min(12, Math.max(1, +e.target.value)) : this.state.nrOfFlashes);
      const present = (e.target.id === 'presentationTime' ? Math.max(100, +e.target.value) : this.state.presentationTime);
      const duration = (e.target.id === 'trialDuration' ? Math.max(4, +e.target.value) : this.state.trialDuration);
      const minDuration = Math.ceil((flashes*present/1000) + (flashes - 1) + 2 + 1);

      if (e.target.id === 'nrOfFlashes') this.setState({ nrOfFlashes: flashes });
      else if (e.target.id === 'presentationTime') this.setState({ presentationTime: present });
      else if (e.target.id === 'trialDuration') this.setState({ trialDuration: duration });

      if (duration < minDuration) {
        this.setState({
          trialDuration: minDuration,
          trialDurationMin: minDuration,
          trialDurationError: true,
        });
      } else {
        this.setState({
          trialDuration: duration,
          trialDurationMin: minDuration,
          trialDurationError: false,
        });
      }
    } else if (e.target.name === 'interstimuliInterval') {
      this.setState({ interstimuliInterval: e.target.id === 'equal' });
    } else if (e.target.id === 'practiceFeedback') {
      this.setState({ practiceFeedback: e.target.checked });
    }
  }

  downloadResults = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += `Test:                       ${this.state.testType}\n`;
    csvContent += `Participant:                ${this.state.participant}\n`;
    csvContent += `Number of rounds:           ${this.state.nrOfTrials}\n`;
    csvContent += `Trial duration:             ${this.state.trialDuration}\n`;
    csvContent += `Number of apples:           ${this.state.nrOfFlashes}\n`;
    csvContent += `Presentation duration:      ${this.state.presentationTime}\n`;
    csvContent += `Interval:                   ${this.state.interstimuliInterval ? 'equal' : 'random'}\n`;
    this.state.results.forEach(result => {
      csvContent += `\n`;
      csvContent += `TRIAL ${result.trial < 10 ? `${result.trial} ` : `${result.trial}`}         ${result.dateISO}\n`;
      csvContent += `--------------------------------------------------------------\n`;
      csvContent += `correct:         ${result.correct}\n`;
      csvContent += `timings:         ${result.sequenceTimings.join(',')}\n`;
      csvContent += `sequence:        ${result.sequence.join(',')}\n`;
      csvContent += `yellow apples:   ${result.yellowApples.join(',')}\n`;
      csvContent += `response:        ${result.response}\n`;
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

  // https://stackoverflow.com/a/51293940/4725211
  distributeAmountInParts = (amount, parts, min = 0) => {
    let results = [];
    let current = 1;
    let balance = amount;
  
    for (let i = 0; i < parts-1; i++) {
        // max num for this spot
        let max = balance - ((parts-current)*min);
        // to avoid big numbers in the beginning and min numbers at the end
        if (i === 0 || Math.random() > 0.5) { // 0.5 can be tuned to your liking
          max = Math.floor(max / 2) + min;
        }
        // generate the number for the spot at 'count'
        let num = Math.floor(Math.random()*(max-min+1)+min);
        // adjust balances
        balance -= num;
        current++;
        // store this number
        results.push(num);
    }
    // push remaining balance into the last spot
    results.push(balance);
    // return
    return shuffle(results);
  }

  playSequence = async () => {
    const startTimestamp = +(new Date());
    let newSequenceTimings = [...this.state.sequenceTimings];
    await sleep(2000);
    for (let i = 0; i < this.state.sequence.length; i++) {
      this.setState({ currentApple: this.state.sequence[i] }, () => {
        newSequenceTimings[i] = (+(new Date()) - startTimestamp)/1000;
      });
      await sleep(this.state.presentationTime);
      this.setState({ currentApple: undefined });
      if (i !== this.state.sequence.length-1) {
        await sleep(this.state.interstimuliInterval ? this.state.timeBetweenFlashes : this.state.timeBetweenFlashes[i]);
      }
    };
    await sleep(1000);
    this.setState({ sequenceTimings: newSequenceTimings });
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
    let remainingTime = ((this.state.trialDuration-2-1)*1000)-(this.state.nrOfFlashes*this.state.presentationTime);
    let nrOfPauses = this.state.nrOfFlashes-1;
    this.setState({
      gameState: 'playing',
      showMenu: false,
      timeBetweenFlashes: this.state.interstimuliInterval
      ? remainingTime/nrOfPauses
      : this.distributeAmountInParts(remainingTime, nrOfPauses, 1000),
      sequenceTimings: Array.from({ length: this.state.nrOfFlashes }),
      sequence: sequence,
      yellowApples: yellowApples,
    });
    await this.playSequence();
    this.setState({
      gameState: 'picking',
      showMenu: true,
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
      sequenceTimings: [...this.state.sequenceTimings],
      sequence: [...this.state.sequence],
      yellowApples: [...this.state.yellowApples],
      response: this.state.response,
    });
    if (this.state.currentTrial === this.state.nrOfTrials) {
      this.setState({
        gameState: 'finished',
        showFeedback: this.state.practiceFeedback,
        results: newResults,
        sequenceTimings: [],
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
        sequenceTimings: [],
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
      if (this.state.yellowApples.includes(this.state.currentApple)) classList.push('yellow-apple');
      else classList.push('red-apple');
    } else if (['initial', 'playing', 'completed', 'finished'].includes(this.state.gameState)) {
      classList.push('box-disabled');
    } else {
      if (this.state.response === box) classList.push('box-picked');
      else classList.push('box-pickable');
    }
    return classList.join(' ');
  }

  render() {
    const startEnabled = (this.state.gameState === 'initial' || this.state.gameState === 'completed');
    const doneEnabled = (this.state.gameState === 'picked');
    return (
      <>
        <Modal id="settingsModal" show={this.state.showSettings} onHide={() => this.setState({ showSettings: false })} size="md">
            <Modal.Header closeButton>
              <Modal.Title>Settings - Yellow Apple Test</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Form>
                <Form.Group as={Row} controlId="participant">
                  <Form.Label column sm={5}>Participant</Form.Label>
                  <Col sm={7}>
                    <Form.Control type="text" value={this.state.participant} autoComplete="off" onChange={this.updateSetting} />
                  </Col>
                </Form.Group>
                <Form.Group as={Row} controlId="nrOfTrials">
                  <Form.Label column sm={5}>Number of trials</Form.Label>
                  <Col sm={7}>
                    <Form.Control type="number" value={this.state.nrOfTrials} onChange={this.updateSetting} />
                  </Col>
                </Form.Group>
                <Form.Group as={Row} controlId="nrOfFlashes">
                  <Form.Label column sm={5}>Number of apples</Form.Label>
                  <Col sm={7}>
                    <Form.Control type="number" value={this.state.nrOfFlashes} onChange={this.updateSetting} />
                  </Col>
                </Form.Group>
                <Form.Group as={Row} controlId="presentationTime">
                  <Form.Label column sm={5}>Presentation time (ms)</Form.Label>
                  <Col sm={7}>
                    <Form.Control type="number" value={this.state.presentationTime} onChange={this.updateSetting} />
                  </Col>
                </Form.Group>
                <Form.Group as={Row} controlId="trialDuration">
                  <Form.Label column sm={5}>Trial duration (s)</Form.Label>
                  <Col sm={7}>
                    <Form.Control type="number" value={this.state.trialDuration} onChange={this.updateSetting} />
                    {this.state.trialDurationError && <span style={{ color: 'red'}}>Trial duration set to {this.state.trialDurationMin}</span>}
                  </Col>
                </Form.Group>
                <fieldset>
                  <Form.Group as={Row}>
                    <Form.Label as="legend" column sm={5}>Interstimuli interval</Form.Label>
                    <Col sm={7}>
                      <Form.Check type="radio" name="interstimuliInterval" id="equal" label="Equal" checked={this.state.interstimuliInterval} onChange={this.updateSetting} />
                      <Form.Check type="radio" name="interstimuliInterval" id="random" label="Random" checked={!this.state.interstimuliInterval} onChange={this.updateSetting} />
                    </Col>
                  </Form.Group>
                </fieldset>
                <Form.Group as={Row} controlId="practiceFeedback">
                  <Form.Label as="legend" column sm={5}>Practice</Form.Label>
                  <Col sm={7} className="p-2 pl-3">
                    <Form.Check type="checkbox" id="practiceFeedback" label="Feedback" checked={this.state.practiceFeedback} onChange={this.updateSetting} />
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
              {this.state.results.sort((a,b) => a.trial > b.trial ? -1 : 1).map((r, i) => (
                <div key={i}>
                  <Row>
                    <Col sm="4">Trial</Col>
                    <Col sm="8">{r.trial}</Col>
                  </Row>
                  <Row>
                    <Col sm="4">Sequence</Col>
                    <Col sm="8">{r.sequence.map(x => this.props.boxMapping[x]).join(', ')}</Col>
                  </Row>
                  <Row>
                    <Col sm="4">Yellow apple</Col>
                    <Col sm="8">{this.props.boxMapping[r.yellowApples[r.yellowApples.length-1]]}</Col>
                  </Row>
                  <Row>
                    <Col sm="4">Response</Col>
                    <Col sm="8">{this.props.boxMapping[r.response]}</Col>
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
          <>
            <div className="menu">
              <div className="actions-btn-group">
                <Link to="/">
                  <Button variant="warning" className="mb-2">
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
            </div>
            <div className="info">
              <OverlayTrigger
                trigger={['hover', 'focus']}
                placement="top-start"
                overlay={
                  <Popover id="info-popover">
                    <Popover.Title as="h3">Help</Popover.Title>
                    <Popover.Content>
                      <p>This is the <strong>Yellow Apple</strong> test.</p>
                      <p>Press <strong>&lt;ctrl&gt;+&lt;space&gt;</strong> to hide all non-essential elements.</p>
                    </Popover.Content>
                  </Popover>
                }
              >
                <Question alt="" title="" />
              </OverlayTrigger>
            </div>
          </>
        )}
        <div className="field-container">
          <div className="field">
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
          </div>
        </div>
      </>
    );
  }
}

export default AppleYellow;
