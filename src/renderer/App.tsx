import { MemoryRouter as Router, Routes, Route, ScrollRestoration } from 'react-router-dom';
import { Suspense } from 'react';
import { RecoilRoot } from 'recoil';
import Index from './pages/index';
import Comic from './pages/comic';
import './App.css';

export default function App() {
  return (
    <RecoilRoot>
      <Suspense fallback={<div>global loading...</div>}>

        <Router>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/comic/:id" element={<Comic />} />
          </Routes>
        </Router>
      </Suspense>
    </RecoilRoot>
  );
}
