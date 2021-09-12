import validate from "@ericblade/barcode-validator";
import Quagga from "@ericblade/quagga2";
import React, { useState, useEffect } from 'react';

import { withRouter } from 'react-router';

import BarcodeInputField from '../barcodeInputField';
import useWindowFocus from "../useWindowFocus";

import VideoSkeleton from './Video.skeleton';

import './video.css';

function getMedian(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const half = Math.floor(sorted.length / 2);
  if (arr.length % 2 === 1) {
    return arr[half];
  }
  return (arr[half - 1] + arr[half]) / 2;
}

function getMedianOfCodeErrors(decodedCodes) {
  const errors = decodedCodes.filter((x) => x.error !== undefined).map((y) => y.error); // TODO: use reduce
  const median = getMedian(errors);
  return { probablyValid: !(median > 0.10 || errors.some((err) => err > 0.1)), median };
}

function getStandardDeviation(array) {
  const n = array.length
  const mean = array.reduce((a, b) => a + b) / n
  return Math.sqrt(array.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n)
}

const Video = ({ history }) => {
  const [ videoInit, setVideoInit ] = useState(false);
  const [ videoError, setVideoError ] = useState(false);
  const [ attempts, setAttempts ] = useState(0);
  const [ barcode, setBarcode ] = useState(null);
  const [ hist, setHist ] = useState({});
  const { focused, visible } = useWindowFocus();

  const onProductFound = (code) => {
    if (code === 'not-found') {
      history.push(`/product/${code}?code=${barcode}`);
    } else {
      history.push(`/product/${code}`);
    }
  }

  const onInitSuccess = () => {
    Quagga.start();
    setVideoInit(true);
  }

  const onDetected = (result) => {
    // Quagga.offDetected(onDetected);
    const { code, decodedCodes } = result.codeResult;
    const err = getMedianOfCodeErrors(decodedCodes);
    const validated = validate(code, "upc");
    if (err.probablyValid || (err.median < 0.25 && validated.valid === true && validated.type === 'upc')) {
      setHist(h => {
        const next = {
          ...h,
          [code]: (h[code] || 0) + 1,
        };
        const me = next[code];
        if (me < 15) {
          return next;
        }
        const counts = Object.values(next)
        if (counts.length === 1) {
          // fifteen perfect reads in a row is good enough
          console.log(code, "perfectly")
        } else {
          const max = Math.max(...counts);
          if (me === max) {
            const stddev = getStandardDeviation(counts);
            const cutoff = max - stddev;
            const clusterSize = Object.keys(next)
              .reduce((s, c) => next[c] >= cutoff ? s + 1 : s, 0);
            if (clusterSize === 1 && stddev >= 1) {
              console.log(code, me, counts.reduce((a, b) => a + b), stddev)
            }
          }
        }
        return next;
      })
    }
    // fetch(`https://world.openfoodfacts.org/api/v0/product/${result.codeResult.code}.json`)
    //   .then(res => res.json())
    //   // eslint-disable-next-line no-use-before-define
    //   .then(res => onInfoFetched(res));
  }

  const onInfoFetched = (res) => {
    const { status, code } = res;
    console.log(status, code, res)
    // setBarcode(code);
    // setAttempts(prevState => prevState + 1);
    //
    // if (status === 1) {
    //   onProductFound(code);
    // } else {
      Quagga.onDetected(onDetected);
    // }
  }

  useEffect(() => {
    if(focused && visible && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      Quagga.init({
        inputStream : {
          name : "Live",
          type : "LiveStream",
          target: document.querySelector('#video')
        },
        numOfWorkers: 1,
        locate: true,
        decoder : {
          readers : ['ean_reader', 'upc_reader']
        },
      }, (err) => {
          if (err) {
            setVideoError(true);
            return;
          }
          onInitSuccess();
      });
      Quagga.onDetected(onDetected);
      return () => Quagga.stop();
    }
    Quagga.stop();
    return undefined;
  }, [focused, visible]);

  useEffect(() => {
    if (attempts > 3) {
      onProductFound('not-found');
    }
  }, [attempts]);

  useEffect(() => {
    window.spit = () =>
    console.log(Object.keys(hist).reduce((s, k) => s + hist[k], 0), Object.keys(hist).length, hist)
  }, [hist])

  return (
    <div>
      <div className="video__explanation">
        <p>Scan a product&apos;s barcode and get its nutritional values <span role="img" aria-label="apple">🍎</span></p>
      </div>
      <div className="video__container">
        {videoError ?
          <div className="skeleton__unsopported">
            <div>
              <p>Your device does not support camera access or something went wrong <span role="img" aria-label="thinking-face">🤔</span></p>
              <p>You can enter the barcode below</p>
              <BarcodeInputField />
            </div>
          </div>
          :
          <div>
            <div className="video" id="video" />
            {videoInit ? '' : <VideoSkeleton />}
          </div>
        }
      </div>
    </div>
    );
}

export default withRouter(Video);
