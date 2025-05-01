import React, { useEffect } from "react";
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { FaShoppingBag, FaUsers, FaBoxOpen, FaChartLine, FaCog } from "react-icons/fa";

const Login = () => {
  const { login, register } = useKindeAuth();

  // Add animation class to features when they appear in viewport
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-fade-in-up');
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.feature-card').forEach(card => {
      observer.observe(card);
    });

    return () => {
      document.querySelectorAll('.feature-card').forEach(card => {
        observer.unobserve(card);
      });
    };
  }, []);

  return (
    <div className="home-page">
      {/* Hero Section */}
      <header className="hero-section animated-gradient">
        <div className="hero-content container">
          <div className="hero-text">
            <h1 className="hero-title animate-fade-in-up">
              <span className="text-gradient">ShopMe</span> - Your All-In-One E-commerce Solution
            </h1>
            <p className="hero-subtitle animate-fade-in-up delay-200">
              Build, manage, and scale your online store with powerful tools and beautiful interfaces
            </p>
            <div className="hero-actions animate-fade-in-up delay-300">
              <button onClick={login} className="btn btn-primary btn-lg ripple">
                Get Started
              </button>
              <button onClick={register} className="btn btn-outline btn-lg ripple">
                Create Account
              </button>
            </div>
          </div>
          <div className="hero-image animate-fade-in-left">
            <div className="dashboard-preview">
              <div className="dashboard-preview-header">
                <div className="preview-dot"></div>
                <div className="preview-dot"></div>
                <div className="preview-dot"></div>
              </div>
              <div className="dashboard-preview-content">
                <div className="preview-stats">
                  <div className="preview-stat-card">
                    <div className="preview-icon"><FaChartLine /></div>
                    <div className="preview-stat-value">284</div>
                    <div className="preview-stat-label">Sales</div>
                  </div>
                  <div className="preview-stat-card">
                    <div className="preview-icon"><FaBoxOpen /></div>
                    <div className="preview-stat-value">48</div>
                    <div className="preview-stat-label">Products</div>
                  </div>
                  <div className="preview-stat-card">
                    <div className="preview-icon"><FaUsers /></div>
                    <div className="preview-stat-value">112</div>
                    <div className="preview-stat-label">Customers</div>
                  </div>
                </div>
                <div className="preview-chart">
                  <div className="chart-line"></div>
                  <div className="chart-line"></div>
                  <div className="chart-line"></div>
                  <div className="chart-bar"></div>
                  <div className="chart-bar"></div>
                  <div className="chart-bar"></div>
                  <div className="chart-bar"></div>
                  <div className="chart-bar"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="hero-wave">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320">
            <path fill="#ffffff" fillOpacity="1" d="M0,96L48,128C96,160,192,224,288,224C384,224,480,160,576,133.3C672,107,768,117,864,144C960,171,1056,213,1152,202.7C1248,192,1344,128,1392,96L1440,64L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
          </svg>
        </div>
      </header>

      {/* Features Section */}
      <section className="features-section container">
        <h2 className="section-title text-center">Why Choose ShopMe?</h2>
        <p className="section-subtitle text-center text-secondary mb-8">
          Everything you need to build a successful online store
        </p>

        <div className="features-grid">
          <div className="feature-card opacity-0">
            <div className="feature-icon">
              <FaShoppingBag />
            </div>
            <h3 className="feature-title">Easy Store Setup</h3>
            <p className="feature-description">
              Get your store up and running in minutes with our intuitive setup wizard and templates.
            </p>
          </div>

          <div className="feature-card opacity-0">
            <div className="feature-icon">
              <FaBoxOpen />
            </div>
            <h3 className="feature-title">Inventory Management</h3>
            <p className="feature-description">
              Track stock levels, set up alerts, and manage products with our powerful inventory tools.
            </p>
          </div>

          <div className="feature-card opacity-0">
            <div className="feature-icon">
              <FaUsers />
            </div>
            <h3 className="feature-title">Customer Management</h3>
            <p className="feature-description">
              Build lasting relationships with your customers through detailed profiles and insights.
            </p>
          </div>

          <div className="feature-card opacity-0">
            <div className="feature-icon">
              <FaChartLine />
            </div>
            <h3 className="feature-title">Analytics Dashboard</h3>
            <p className="feature-description">
              Make data-driven decisions with our comprehensive analytics and reporting tools.
            </p>
          </div>

          <div className="feature-card opacity-0">
            <div className="feature-icon">
              <FaCog />
            </div>
            <h3 className="feature-title">Store Customization</h3>
            <p className="feature-description">
              Customize every aspect of your store to match your brand and vision.
            </p>
          </div>

          <div className="feature-card opacity-0">
            <div className="feature-icon">
              <FaUsers />
            </div>
            <h3 className="feature-title">Team Collaboration</h3>
            <p className="feature-description">
              Invite team members and manage permissions to collaborate effectively.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2 className="cta-title">Ready to grow your business?</h2>
            <p className="cta-subtitle">
              Join thousands of successful merchants using ShopMe to power their online stores.
            </p>
            <div className="cta-actions">
              <button onClick={register} className="btn btn-primary btn-lg ripple">
                Start Free Trial
              </button>
              <button onClick={login} className="btn btn-ghost btn-lg">
                Learn More
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-logo">
              <h2>ShopMe</h2>
              <p>Your all-in-one e-commerce solution</p>
            </div>
            <div className="footer-links">
              <div className="footer-links-column">
                <h3>Product</h3>
                <ul>
                  <li><a href="#">Features</a></li>
                  <li><a href="#">Pricing</a></li>
                  <li><a href="#">Integrations</a></li>
                  <li><a href="#">Marketplace</a></li>
                </ul>
              </div>
              <div className="footer-links-column">
                <h3>Resources</h3>
                <ul>
                  <li><a href="#">Documentation</a></li>
                  <li><a href="#">Guides</a></li>
                  <li><a href="#">API Reference</a></li>
                  <li><a href="#">Blog</a></li>
                </ul>
              </div>
              <div className="footer-links-column">
                <h3>Company</h3>
                <ul>
                  <li><a href="#">About Us</a></li>
                  <li><a href="#">Careers</a></li>
                  <li><a href="#">Contact</a></li>
                  <li><a href="#">Legal</a></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; {new Date().getFullYear()} ShopMe. All rights reserved.</p>
            <div className="footer-social">
              <a href="#" className="social-link">
                <i className="fab fa-twitter"></i>
              </a>
              <a href="#" className="social-link">
                <i className="fab fa-facebook"></i>
              </a>
              <a href="#" className="social-link">
                <i className="fab fa-instagram"></i>
              </a>
              <a href="#" className="social-link">
                <i className="fab fa-linkedin"></i>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Login;
