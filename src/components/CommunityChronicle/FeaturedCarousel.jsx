import { Card, CardContent, Typography, Box } from '@mui/material';
import Carousel from 'react-material-ui-carousel';

const FeaturedCarousel = ({ items }) => (
  <Carousel
    indicatorIconButtonProps={{
        style: {
            color: 'rgba(95, 240, 255, 0.3)'
        }
    }}
    activeIndicatorIconButtonProps={{
        style: {
            color: 'var(--hud-primary-color)'
        }
    }}
    sx={{ mb: 4 }}
  >
    {items.map(item => (
      <Card className="carousel-card fade-in" key={item.id} sx={{ height: '200px' }}>
        <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
          <Typography variant="h5" sx={{ color: 'var(--hud-secondary-color)', fontFamily: 'var(--hud-header-font)', mb: 2 }}>
            {item.name}
          </Typography>
          <Typography variant="body1" sx={{ color: 'white', fontStyle: 'italic' }}>
            "{item.reflection}"
          </Typography>
        </CardContent>
      </Card>
    ))}
  </Carousel>
);

export default FeaturedCarousel;
