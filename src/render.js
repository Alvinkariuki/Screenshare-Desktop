const { desktopCapturer, remote } = require("electron");
const { Menu, dialog } = remote;
const { writeFile, truncate } = require("fs");

// MediaRecorder instance to capture footage
let mediaRecorder;

const recordedChunks = [];

// Buttons
const videoElement = document.querySelector("video");

const videoSelectBtn = document.getElementById("videoSelectBtn");
videoSelectBtn.onclick = getVideoSources;

// Start button
const startBtn = document.getElementById("startBtn");
startBtn.onclick = (e) => {
  mediaRecorder.start();
  startBtn.classList.add("is-danger");
  startBtn.innerText = "Recording";
};

// Stop button
const stopBtn = document.getElementById("stopBtn");
stopBtn.onclick = (e) => {
  mediaRecorder.stop();
  startBtn.classList.remove("is-danger");
  startBtn.innerText = "Start";
};

// Get available video sources
async function getVideoSources() {
  const inputSources = await desktopCapturer.getSources({
    types: ["window", "screen"],
  });

  const videoOptionsMenu = Menu.buildFromTemplate(
    inputSources.map((source) => {
      return {
        label: source.name,
        click: () => selectSource(source),
      };
    })
  );

  videoOptionsMenu.popup();
}

// Change the videoSource window to record
async function selectSource(source) {
  videoSelectBtn.innerHTML = source.name;

  const constraintsVideo = {
    audio: false,

    video: {
      mandatory: {
        chromeMediaSource: "desktop",
        chromeMediaSourceId: source.id,
      },
    },
  };

  const constraintsAudio = {audio: true}

  try {
       // Create audio and video streams seperately
       const audioStream = await navigator.mediaDevices.getUserMedia(constraintsAudio);
       const videoStream = await navigator.mediaDevices.getUserMedia(constraintsVideo);

       // combine the streams
       const audioVideoStream = new MediaStream([...videoStream.getVideoTracks(), ...audioStream.getAudioTracks()])

      // Preview the source in a video element
      videoElement.srcObject = audioVideoStream;
      
      // Remove the echoing effect of the audio 
      videoElement.muted = true;
      videoElement.play();

      // Create the media recorder
      const options = { mimeType: "video/webm; codecs=vp9" };
      mediaRecorder = new MediaRecorder(audioVideoStream, options);

      // Register Event handlers
      mediaRecorder.ondataavailable = handleDataAvailable;
      mediaRecorder.onstop = handleStop;
  }catch (err) {
    console.log(err)
  }
  
}

function handleDataAvailable(e) {
  console.log("Video available");
  recordedChunks.push(e.data);
}

// Save the video file on stop
async function handleStop(e) {
  const blob = new Blob(recordedChunks, {
    type: "video/webm; codecs=vp9",
  });

  const buffer = Buffer.from(await blob.arrayBuffer());

  const { filePath } = await dialog.showSaveDialog({
    buttonLabel: "Save video",
    defaultPath: `vid-${Date.now()}.webm`,
  });

  console.log(filePath);

  writeFile(filePath, buffer, () => console.log("Video saved successfully"));
}
