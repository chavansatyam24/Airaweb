import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import Brain from '../pages/Brain/index';
import Chat from '../pages/Chat/index';
import ClientDetail from '../pages/ClientDetail/index';
import ClientPromises from '../pages/ClientPromises/index';
import Clients from '../pages/Clients/index';
import Disputes from '../pages/Disputes/index';
import Login from '../pages/Login/index';
import Queue from '../pages/Queue/index';
import Promises from '../pages/Promises/index';
import Settings from '../pages/Settings/index';
import Settlement from '../pages/Settlement/index';
import StyleReview from '../pages/StyleReview/index';
import Unfix from '../pages/Unfix/index';
import Held from '../pages/Queue/Held';

function Protected({ children }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Navigate to="/queue" replace />} />
      <Route path="/queue" element={<Protected><Queue /></Protected>} />
      <Route path="/held" element={<Protected><Held /></Protected>} />
      <Route path="/clients" element={<Protected><Clients /></Protected>} />
      <Route path="/client/:id" element={<Protected><ClientDetail /></Protected>} />
      <Route path="/promises" element={<Protected><Promises /></Protected>} />
      <Route path="/promises/:clientCode" element={<Protected><ClientPromises /></Protected>} />
      <Route path="/disputes" element={<Protected><Disputes /></Protected>} />
      <Route path="/unfix" element={<Protected><Unfix /></Protected>} />
      <Route path="/settlement/:id" element={<Protected><Settlement /></Protected>} />
      <Route path="/brain" element={<Protected><Brain /></Protected>} />
      <Route path="/chat" element={<Protected><Chat /></Protected>} />
      <Route path="/style-review" element={<Protected><StyleReview /></Protected>} />
      <Route path="/settings" element={<Protected><Settings /></Protected>} />
      <Route path="*" element={<Navigate to="/queue" replace />} />
    </Routes>
  );
}
