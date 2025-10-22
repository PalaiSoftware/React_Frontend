import { useState } from "react";

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  const [faqs, setFaqs] = useState([
    {
      question: "How do I track Inventory in real-time?",
      answer:
        "Our system provides real-time tracking through automated updates and integrations with your warehouse tools. Simply log in to view live stock levels and set alerts for low inventory.",
      open: false,
    },
    {
      question: "Can I integrate this system with my existing software?",
      answer:
        "Yes, our Inventory Management System supports API integrations with popular platforms like QuickBooks, Shopify, and more. Contact our support team for custom integration assistance.",
      open: false,
    },
    {
      question: "What kind of support do you offer?",
      answer:
        "We offer 24/7 email and chat support, as well as premium phone support for enterprise users. Reach out via this contact form for any assistance.",
      open: false,
    },
    {
      question: "Is there a mobile app for Inventory management?",
      answer:
        "Yes, our mobile app is available on iOS and Android, allowing you to manage inventory on the go with full functionality.",
      open: false,
    },
  ]);

  const toggleFaq = (index) => {
    setFaqs((prev) =>
      prev.map((faq, i) =>
        i === index ? { ...faq, open: !faq.open } : faq
      )
    );
  };

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Contact Form Data:", formData);
    alert("Message sent successfully!");
    setFormData({ name: "", email: "", message: "" });
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      {/* Card Container */}
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl p-6">
        <h1 className="text-2xl md:text-3xl font-bold text-center mb-6 md:mb-8">
          Contact Us
        </h1>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Map */}
          <div>
            <iframe
              title="Google Map"
              src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d341.9268291487058!2d86.69467060362325!3d21.297947432613284!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a1c6f9c33ff713d%3A0x228b40517b92449a!2sNew%20Rajsthan%20marble%20soro%20-%20Best%20marble%2C%20granite%20and%20tiles%20showroom%20in%20soro!5e1!3m2!1sen!2sin!4v1761116821304!5m2!1sen!2sin"
              className="w-full h-56 rounded-lg shadow-md"
              allowFullScreen=""
              loading="lazy"
            ></iframe>

            <p className="mt-1 text-gray-600 text-sm">
              Soro, Baleswar, Orissa, India - 756045
            </p>
          </div>

          {/* Contact Form */}
          <div>
            <h2 className="text-lg md:text-xl font-semibold mb-3">Get in Touch</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="text"
                name="name"
                placeholder="Your Name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-sky-500 outline-none text-sm"
              />
              <input
                type="email"
                name="email"
                placeholder="Your Email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-sky-500 outline-none text-sm"
              />
              <textarea
                name="message"
                placeholder="Your Message"
                value={formData.message}
                onChange={handleChange}
                rows="3"
                required
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-sky-500 outline-none text-sm"
              ></textarea>
              <button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-md transition text-sm"
              >
                Send Message
              </button>
            </form>
          </div>
        </div>

        {/* FAQs */}
        <div className="max-w-2xl mx-auto mt-8">
          <h2 className="text-xl font-bold text-center mb-4 border-b pb-2">
            Frequently Asked Questions
          </h2>
          <div className="space-y-2">
            {faqs.map((faq, idx) => (
              <div key={idx} className="border-b last:border-b-0">
                <button
                  className="w-full text-left px-3 py-2 font-medium flex justify-between items-center text-sm"
                  onClick={() => toggleFaq(idx)}
                >
                  {faq.question}
                  <span>{faq.open ? "-" : "+"}</span>
                </button>
                {faq.open && (
                  <p className="px-3 py-2 text-gray-700 text-sm">{faq.answer}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
