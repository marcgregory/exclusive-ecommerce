import { ShoppingBag, User } from 'lucide-react';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { ServiceBadges } from '../components/ServiceBadges';

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
              Launched in 2015, Exclusive is South Asia's premier online shopping marketplace with
              an active presence in Bangladesh.
            </p>
            <p>
              Exclusive offers a diverse assortment in categories ranging from consumer electronics
              to lifestyle essentials.
            </p>
          </div>
          <div className="story-image">
            <ShoppingBag size={120} />
          </div>
        </div>
      </section>
      <section className="container stats">
        <div>
          <strong>10.5k</strong>
          <span>Sellers active our site</span>
        </div>
        <div>
          <strong>33k</strong>
          <span>Monthly product sale</span>
        </div>
        <div>
          <strong>45.5k</strong>
          <span>Customers active in our site</span>
        </div>
        <div>
          <strong>25k</strong>
          <span>Annual gross sale</span>
        </div>
      </section>
      <section className="container team">
        <TeamCard name="Tom Cruise" role="Founder & Chairman" />
        <TeamCard name="Emma Watson" role="Managing Director" />
        <TeamCard name="Will Smith" role="Product Designer" />
      </section>
      <div className="container">
        <ServiceBadges />
      </div>
    </main>
  );
}

type TeamCardProps = {
  name: string;
  role: string;
};

function TeamCard({ name, role }: TeamCardProps) {
  return (
    <article>
      <div className="team-photo">
        <User size={110} />
      </div>
      <h3>{name}</h3>
      <p>{role}</p>
    </article>
  );
}
