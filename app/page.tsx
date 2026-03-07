import Chessboard from "../components/Chessboard";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-8 bg-slate-50 text-slate-900">      
      <Chessboard />
    </main>
  );
}