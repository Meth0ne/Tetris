const { useCallback, useEffect, useMemo, useState } = React;

const WIDTH = 10;
const HEIGHT = 20;
const EMPTY = 0;
const DROP_INTERVAL_MS = 600;

const SHAPES = {
  I: [[1, 1, 1, 1]],
  O: [
    [2, 2],
    [2, 2],
  ],
  T: [
    [0, 3, 0],
    [3, 3, 3],
  ],
  S: [
    [0, 4, 4],
    [4, 4, 0],
  ],
  Z: [
    [5, 5, 0],
    [0, 5, 5],
  ],
  J: [
    [6, 0, 0],
    [6, 6, 6],
  ],
  L: [
    [0, 0, 7],
    [7, 7, 7],
  ],
};

const COLORS = {
  0: "var(--empty)",
  1: "#22d3ee",
  2: "#facc15",
  3: "#a78bfa",
  4: "#4ade80",
  5: "#fb7185",
  6: "#60a5fa",
  7: "#fb923c",
};

const SHAPE_KEYS = Object.keys(SHAPES);

function createEmptyBoard() {
  return Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(EMPTY));
}

function rotateClockwise(matrix) {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const rotated = Array.from({ length: cols }, () => Array(rows).fill(0));

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      rotated[x][rows - 1 - y] = matrix[y][x];
    }
  }

  return rotated;
}

function randomShape() {
  const key = SHAPE_KEYS[Math.floor(Math.random() * SHAPE_KEYS.length)];
  const matrix = SHAPES[key].map((row) => [...row]);
  const x = Math.floor((WIDTH - matrix[0].length) / 2);
  return { key, matrix, x, y: 0 };
}

function collides(board, piece) {
  const { matrix, x: pieceX, y: pieceY } = piece;

  for (let y = 0; y < matrix.length; y += 1) {
    for (let x = 0; x < matrix[y].length; x += 1) {
      if (!matrix[y][x]) continue;

      const boardX = pieceX + x;
      const boardY = pieceY + y;

      if (boardX < 0 || boardX >= WIDTH || boardY >= HEIGHT) return true;
      if (boardY >= 0 && board[boardY][boardX] !== EMPTY) return true;
    }
  }

  return false;
}

function mergePiece(board, piece) {
  const nextBoard = board.map((row) => [...row]);

  piece.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (!value) return;
      const boardY = piece.y + y;
      const boardX = piece.x + x;
      if (boardY >= 0 && boardY < HEIGHT && boardX >= 0 && boardX < WIDTH) {
        nextBoard[boardY][boardX] = value;
      }
    });
  });

  return nextBoard;
}

function clearLines(board) {
  const keptRows = board.filter((row) => row.some((cell) => cell === EMPTY));
  const cleared = HEIGHT - keptRows.length;
  const newRows = Array.from({ length: cleared }, () => Array(WIDTH).fill(EMPTY));
  return { board: [...newRows, ...keptRows], cleared };
}

function getDropSpeed(level) {
  return Math.max(120, DROP_INTERVAL_MS - (level - 1) * 55);
}

function Tetris() {
  const [board, setBoard] = useState(createEmptyBoard);
  const [currentPiece, setCurrentPiece] = useState(() => randomShape());
  const [nextPiece, setNextPiece] = useState(() => randomShape());
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const spawnPiece = useCallback(
    (updatedBoard) => {
      const pieceToSpawn = nextPiece;
      const freshNext = randomShape();
      const centered = {
        ...pieceToSpawn,
        x: Math.floor((WIDTH - pieceToSpawn.matrix[0].length) / 2),
        y: 0,
      };

      setNextPiece(freshNext);
      if (collides(updatedBoard, centered)) {
        setIsGameOver(true);
        return;
      }
      setCurrentPiece(centered);
    },
    [nextPiece],
  );

  const lockPiece = useCallback(
    (pieceToLock) => {
      setBoard((prevBoard) => {
        const merged = mergePiece(prevBoard, pieceToLock);
        const { board: clearedBoard, cleared } = clearLines(merged);

        if (cleared > 0) {
          const pointsByLines = [0, 100, 300, 500, 800];
          setScore((prev) => prev + pointsByLines[cleared] * level);
          setLines((prev) => {
            const total = prev + cleared;
            const nextLevel = Math.floor(total / 10) + 1;
            setLevel(nextLevel);
            return total;
          });
        }

        spawnPiece(clearedBoard);
        return clearedBoard;
      });
    },
    [level, spawnPiece],
  );

  const movePiece = useCallback(
    (dx, dy) => {
      if (isPaused || isGameOver) return;

      const moved = { ...currentPiece, x: currentPiece.x + dx, y: currentPiece.y + dy };
      if (!collides(board, moved)) {
        setCurrentPiece(moved);
        return;
      }

      if (dy > 0) lockPiece(currentPiece);
    },
    [board, currentPiece, isGameOver, isPaused, lockPiece],
  );

  const rotatePiece = useCallback(() => {
    if (isPaused || isGameOver) return;

    const rotated = { ...currentPiece, matrix: rotateClockwise(currentPiece.matrix) };
    const kicks = [0, -1, 1, -2, 2];

    for (let i = 0; i < kicks.length; i += 1) {
      const test = { ...rotated, x: rotated.x + kicks[i] };
      if (!collides(board, test)) {
        setCurrentPiece(test);
        return;
      }
    }
  }, [board, currentPiece, isGameOver, isPaused]);

  const hardDrop = useCallback(() => {
    if (isPaused || isGameOver) return;

    let dropped = { ...currentPiece };
    while (!collides(board, { ...dropped, y: dropped.y + 1 })) {
      dropped = { ...dropped, y: dropped.y + 1 };
    }
    lockPiece(dropped);
  }, [board, currentPiece, isGameOver, isPaused, lockPiece]);

  const resetGame = useCallback(() => {
    setBoard(createEmptyBoard());
    setCurrentPiece(randomShape());
    setNextPiece(randomShape());
    setScore(0);
    setLines(0);
    setLevel(1);
    setIsGameOver(false);
    setIsPaused(false);
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.repeat) return;

      switch (event.code) {
        case "ArrowLeft":
          event.preventDefault();
          movePiece(-1, 0);
          break;
        case "ArrowRight":
          event.preventDefault();
          movePiece(1, 0);
          break;
        case "ArrowDown":
          event.preventDefault();
          movePiece(0, 1);
          break;
        case "ArrowUp":
          event.preventDefault();
          rotatePiece();
          break;
        case "Space":
          event.preventDefault();
          hardDrop();
          break;
        case "KeyP":
          event.preventDefault();
          setIsPaused((prev) => !prev);
          break;
        case "KeyR":
          event.preventDefault();
          resetGame();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [hardDrop, movePiece, resetGame, rotatePiece]);

  useEffect(() => {
    if (isPaused || isGameOver) return undefined;
    const timer = setInterval(() => movePiece(0, 1), getDropSpeed(level));
    return () => clearInterval(timer);
  }, [isPaused, isGameOver, level, movePiece]);

  const displayBoard = useMemo(() => {
    const merged = board.map((row) => [...row]);
    currentPiece.matrix.forEach((row, y) => {
      row.forEach((value, x) => {
        if (!value) return;
        const boardY = currentPiece.y + y;
        const boardX = currentPiece.x + x;
        if (boardY >= 0 && boardY < HEIGHT && boardX >= 0 && boardX < WIDTH) {
          merged[boardY][boardX] = value;
        }
      });
    });
    return merged;
  }, [board, currentPiece]);

  return (
    <main
      style={{
        display: "grid",
        gap: "16px",
        gridTemplateColumns: "minmax(220px, 1fr) minmax(280px, auto)",
        background: "rgba(2, 6, 23, 0.8)",
        border: "1px solid #334155",
        borderRadius: "16px",
        padding: "16px",
        backdropFilter: "blur(8px)",
      }}
    >
      <section>
        <h1 style={{ margin: "0 0 12px", fontSize: "24px" }}>Tetris</h1>
        <div style={{ color: "var(--muted)", marginBottom: "12px", fontSize: "14px" }}>
          Left/Right: move - Up: rotate - Down: soft drop
          <br />
          Space: hard drop - P: pause - R: restart
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${WIDTH}, 24px)`,
            gridTemplateRows: `repeat(${HEIGHT}, 24px)`,
            gap: "1px",
            background: "var(--grid)",
            width: "fit-content",
            border: "1px solid #334155",
            padding: "1px",
          }}
        >
          {displayBoard.flat().map((cell, idx) => (
            <div
              key={idx}
              style={{
                width: 24,
                height: 24,
                background: COLORS[cell],
                borderRadius: "3px",
              }}
            />
          ))}
        </div>
      </section>

      <aside
        style={{
          background: "var(--panel)",
          border: "1px solid #334155",
          borderRadius: "12px",
          padding: "12px",
          minWidth: "220px",
        }}
      >
        <div style={{ marginBottom: "8px" }}>Score: {score}</div>
        <div style={{ marginBottom: "8px" }}>Lines: {lines}</div>
        <div style={{ marginBottom: "14px" }}>Level: {level}</div>

        <div style={{ marginBottom: "10px", color: "var(--muted)" }}>Next piece:</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 20px)",
            gridTemplateRows: "repeat(4, 20px)",
            gap: "1px",
            background: "var(--grid)",
            padding: "4px",
            width: "fit-content",
            marginBottom: "14px",
          }}
        >
          {Array.from({ length: 4 }).flatMap((_, y) =>
            Array.from({ length: 4 }).map((__, x) => {
              const value = nextPiece.matrix[y]?.[x] || 0;
              return (
                <div
                  key={`${y}-${x}`}
                  style={{
                    width: 20,
                    height: 20,
                    background: COLORS[value],
                    borderRadius: "3px",
                  }}
                />
              );
            }),
          )}
        </div>

        {isGameOver ? <div style={{ color: "#f87171", marginBottom: "10px" }}>Game over</div> : null}
        {isPaused ? <div style={{ color: "#fbbf24", marginBottom: "10px" }}>Paused</div> : null}

        <button
          type="button"
          onClick={resetGame}
          style={{
            cursor: "pointer",
            border: "none",
            background: "#2563eb",
            color: "white",
            padding: "10px 12px",
            borderRadius: "8px",
            fontWeight: 600,
          }}
        >
          Restart game
        </button>
      </aside>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<Tetris />);