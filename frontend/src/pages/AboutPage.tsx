import {
  BadgeDollarSign,
  DollarSign,
  Instagram,
  Linkedin,
  ShoppingBag,
  Store,
  Twitter,
} from 'lucide-react';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { ServiceBadges } from '../components/ServiceBadges';

const storyImage = '/assets/about/story-shoppers.png';

const stats = [
  {
    icon: Store,
    value: '10.5k',
    label: 'Sellers active our site',
  },
  {
    icon: DollarSign,
    value: '33k',
    label: 'Monthly Product Sale',
    featured: true,
  },
  {
    icon: ShoppingBag,
    value: '45.5k',
    label: 'Customers active in our site',
  },
  {
    icon: BadgeDollarSign,
    value: '25k',
    label: 'Annual gross sale in our site',
  },
];

const teamMembers = [
  {
    name: 'Tom Cruise',
    role: 'Founder & Chairman',
    image: '/assets/about/team-founder.png',
  },
  {
    name: 'Emma Watson',
    role: 'Managing Director',
    image: '/assets/about/team-director.png',
  },
  {
    name: 'Will Smith',
    role: 'Product Designer',
    image: '/assets/about/team-designer.png',
  },
];

export function AboutPage() {
  return (
    <main className="page about-page">
      <div className="container">
        <Breadcrumbs items={['Home', 'About']} />
      </div>
      <section className="about-hero">
        <div className="container about-hero__inner">
          <div>
            <h1>Our Story</h1>
            <p>
              Launched in 2015, Exclusive is South Asia's premier online shopping marketplace with an
              active presence in Bangladesh. Supported by a wide range of tailored marketing, data,
              and service solutions, Exclusive has thousands of sellers and brands and serves
              millions of customers across the region.
            </p>
            <p>
              Exclusive has more than 1 million products to offer, growing at a very fast pace.
              Exclusive offers a diverse assortment in categories ranging from consumer electronics to
              lifestyle essentials.
            </p>
          </div>
          <div className="story-image">
            <img src={storyImage} alt="Two shoppers smiling with colorful shopping bags" />
          </div>
        </div>
      </section>
      <section className="container stats">
        {stats.map(({ icon: Icon, value, label, featured }) => (
          <article className={featured ? 'is-featured' : undefined} key={label}>
            <span className="stats-icon" aria-hidden="true">
              <Icon />
            </span>
            <strong>{value}</strong>
            <span>{label}</span>
          </article>
        ))}
      </section>
      <section className="container team">
        {teamMembers.map((member) => (
          <TeamCard key={member.name} {...member} />
        ))}
      </section>
      <div className="about-slider-dots" aria-hidden="true">
        <span />
        <span />
        <span className="is-active" />
        <span />
        <span />
      </div>
      <div className="container">
        <ServiceBadges />
      </div>
    </main>
  );
}

type TeamCardProps = {
  name: string;
  role: string;
  image: string;
};

function TeamCard({ name, role, image }: TeamCardProps) {
  return (
    <article>
      <div className="team-photo">
        <img src={image} alt={`${name}, ${role}`} />
      </div>
      <h3>{name}</h3>
      <p>{role}</p>
      <div className="team-socials" aria-label={`${name} social links`}>
        <button aria-label={`${name} on Twitter`} type="button">
          <Twitter size={16} />
        </button>
        <button aria-label={`${name} on Instagram`} type="button">
          <Instagram size={16} />
        </button>
        <button aria-label={`${name} on LinkedIn`} type="button">
          <Linkedin size={16} />
        </button>
      </div>
    </article>
  );
}
