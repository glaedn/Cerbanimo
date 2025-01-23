import logo from './logo.svg';
import LoginButton from './components/Auth/LoginButton';
import LogoutButton from './components/Auth/Logoutbutton';
import './App.css';

function App() {
  return (
    <div>
          <h1>Welcome to Cerbanimo</h1>
          <LoginButton />
          <LogoutButton />
        </div>
  );
}
export default App; 