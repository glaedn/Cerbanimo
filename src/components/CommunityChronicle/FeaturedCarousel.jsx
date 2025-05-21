import { Card, CardContent, Typography } from '@mui/material';
import Carousel from 'react-material-ui-carousel';

const FeaturedCarousel = ({ items }) => (
  <Carousel>
    {items.map(item => (
      <Card className="carousel-card fade-in" key={item.id} >
        <CardContent>
          <Typography variant="h6">{item.name}</Typography>
          <Typography>{item.reflection}</Typography>
        </CardContent>
      </Card>
    ))}
  </Carousel>
);

export default FeaturedCarousel;
