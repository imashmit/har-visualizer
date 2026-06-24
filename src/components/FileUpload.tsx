import { useCallback, useRef, useState } from 'react'
import './FileUpload.css'

interface Props {
  onFile: (text: string, fileName: string) => void
  onLoadSample: () => void
  error?: string | null
}

export function FileUpload({ onFile, onLoadSample, error }: Props) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const readFile = useCallback(
    (file: File) => {
      const reader = new FileReader()
      reader.onload = () => onFile(String(reader.result ?? ''), file.name)
      reader.readAsText(file)
    },
    [onFile],
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const file = e.dataTransfer.files?.[0]
      if (file) readFile(file)
    },
    [readFile],
  )

  return (
    <div className="upload-screen">
      <div className="upload-hero">
        <div className="upload-logo" aria-hidden>
          <svg width="52" height="52" viewBox="0 0 32 32">
            <rect width="32" height="32" rx="7" fill="#0f1730" />
            <path
              d="M4 17 H11 L14 11 L18 22 L20.5 17 H23"
              fill="none"
              stroke="#6366f1"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="25" cy="17" r="2.6" fill="#34d399" />
          </svg>
        </div>
        <h1>HAR Visualizer</h1>
        <p className="upload-sub">
          Drop in a <code>.har</code> capture to explore every network request &mdash;
          status, timing, headers and payloads &mdash; in a clean, visual way.
        </p>
        <p className="upload-privacy">
          <PrivacyIcon /> Files are parsed entirely in your browser. Nothing is uploaded.
        </p>

        <div
          className={`dropzone${dragging ? ' dragging' : ''}`}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
          }}
        >
          <UploadIcon />
          <div className="dropzone-text">
            <strong>Drag &amp; drop your HAR file</strong>
            <span>or click to browse</span>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".har,application/json,.json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) readFile(file)
              e.target.value = ''
            }}
          />
        </div>

        {error && <div className="upload-error">{error}</div>}

        <button className="sample-btn" onClick={onLoadSample}>
          Try it with a sample capture
        </button>

        <div className="how-to">
          <span>How to get a HAR file:</span> In Chrome or Edge DevTools, open the{' '}
          <strong>Network</strong> tab, then right-click a request and choose{' '}
          <strong>Save all as HAR</strong>.
        </div>
      </div>
    </div>
  )
}

function UploadIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 16V4m0 0L7 9m5-5 5 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 17v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function PrivacyIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3l7 3v5c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6l7-3z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M9 12l2 2 4-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
