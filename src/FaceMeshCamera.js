import React, { useEffect, useRef, useState } from "react";
import { FaceMesh } from "@mediapipe/face_mesh";
import { Camera } from "@mediapipe/camera_utils";

export default function FaceMeshCamera() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let faceMesh;
    let camera;

    const initializeCamera = async () => {
      try {
        // Check if browser supports getUserMedia
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error(
            "Browser tidak mendukung akses kamera. Pastikan menggunakan HTTPS."
          );
        }

        // Check if running on HTTPS (required for camera access)
        if (
          window.location.protocol !== "https:" &&
          window.location.hostname !== "localhost"
        ) {
          throw new Error(
            "Akses kamera memerlukan HTTPS. Pastikan situs di-deploy dengan HTTPS."
          );
        }

        faceMesh = new FaceMesh({
          locateFile: (file) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
        });

        faceMesh.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        faceMesh.onResults((results) => {
          const canvas = canvasRef.current;
          if (!canvas) return;

          const ctx = canvas.getContext("2d");
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

          if (results.multiFaceLandmarks) {
            for (const landmarks of results.multiFaceLandmarks) {
              drawLandmarks(ctx, landmarks, canvas.width, canvas.height);
            }
          }
        });

        // Ensure video element has proper attributes
        if (videoRef.current) {
          videoRef.current.setAttribute("playsinline", "");
          videoRef.current.setAttribute("webkit-playsinline", "");
        }

        camera = new Camera(videoRef.current, {
          onFrame: async () => {
            if (videoRef.current && faceMesh) {
              await faceMesh.send({ image: videoRef.current });
            }
          },
          width: 640,
          height: 480,
        });

        await camera.start();
        setLoading(false);
        setError(null);
      } catch (err) {
        console.error("Error initializing camera:", err);
        setError(
          err.message ||
            "Gagal mengakses kamera. Pastikan izin kamera diberikan."
        );
        setLoading(false);
      }
    };

    initializeCamera();

    // Cleanup function
    return () => {
      if (camera) {
        camera.stop();
      }
      if (faceMesh) {
        faceMesh.close();
      }
    };
  }, []);

  return (
    <div style={{ position: "relative", width: 640 }}>
      <video ref={videoRef} style={{ display: "none" }} playsInline />
      {loading && (
        <div
          style={{
            width: 640,
            height: 480,
            border: "1px solid #ccc",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#f0f0f0",
          }}
        >
          <p>Memuat kamera...</p>
        </div>
      )}
      {error && (
        <div
          style={{
            width: 640,
            height: 480,
            border: "1px solid #ccc",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#ffe0e0",
            padding: "20px",
            textAlign: "center",
          }}
        >
          <div>
            <p style={{ color: "red", margin: 0 }}>{error}</p>
            <p style={{ fontSize: "12px", marginTop: "10px", color: "#666" }}>
              Tips: Pastikan situs menggunakan HTTPS dan izin kamera telah
              diberikan.
            </p>
          </div>
        </div>
      )}
      {!loading && !error && (
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          style={{ border: "1px solid #ccc" }}
        />
      )}
    </div>
  );
}

function drawLandmarks(ctx, landmarks, width, height) {
  ctx.fillStyle = "red";

  landmarks.forEach((point) => {
    const x = point.x * width;
    const y = point.y * height;

    ctx.beginPath();
    ctx.arc(x, y, 1.5, 0, 2 * Math.PI);
    ctx.fill();
  });
}
