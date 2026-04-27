import { Link } from 'react-router-dom';
import { Button } from '../../components/Button';

export const NotFound = () => {
  return (
    <div className="not-found-container">
      <div className="not-found-card" data-aos="fade-up" data-aos-duration="800">
        <h1 className="not-found-code" data-aos="zoom-in" data-aos-duration="800">404</h1>
        <h2 className="not-found-title" data-aos="fade-up" data-aos-delay="100" data-aos-duration="800">Page Not Found</h2>
        <p className="not-found-message" data-aos="fade-up" data-aos-delay="200" data-aos-duration="800">
          The page you are looking for doesn't exist or you don't have permission to access it.
        </p>
        <Link to="/login">
          <Button className="w-full">Back to Login</Button>
        </Link>
      </div>
    </div>
  );
};
