import { Carousel } from "antd";

const Hero = () => {
  return (
    <Carousel autoplay>
      <div>
        <img
          src="https://images.unsplash.com/photo-1523381294911-8d3cead13475"
          style={{ width: "100%", height: 500, objectFit: "cover" }}
        />
      </div>
      <div>
        <img
          src="https://images.unsplash.com/photo-1491553895911-0055eca6402d"
          style={{ width: "100%", height: 500, objectFit: "cover" }}
        />
      </div>
    </Carousel>
  );
};

export default Hero;