import React from "react";
import { useNavigate } from "react-router-dom";
import img1 from "../assets/images/img6.jpeg";
import img4 from "../assets/images/img4.png";
import img5 from "../assets/images/img5.jpg";
import img2 from "../assets/images/img7.jpeg";
import logo2 from "../assets/images/logo.png";
import logo1 from "../assets/images/rt.png";
import { FaFacebookSquare } from "react-icons/fa";
import { MdEmail } from "react-icons/md";
import { FaPhoneAlt } from "react-icons/fa";
import { IoChatbox } from "react-icons/io5";
import { IoLogoWhatsapp } from "react-icons/io";

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center p-8">
      <div className="w-full flex flex-row sm:flex-row justify-start items-center py-4 px-8">
  <img className="w-28 h-15 sm:w-40 sm:h-18" src={logo1} alt="logo" />
  <img className="w-28 h-12 sm:w-40 sm:h-18 sm:ml-5 ml-3" src={logo2} alt="logo" />
</div>
      <div className="flex flex-col md:flex-row w-full max-w-6xl">
        <div className="w-full md:w-1/2 flex flex-col justify-start p-3 mt-10">
          <h2 className="text-2xl font-bold text-white">
            Need to Digitalize Your Business?
          </h2>
          <p className="text-white mt-4">
            Retail Target Software Solutions (Pvt) Ltd. has been revolutionizing
            business software for over 15 years, empowering 800+ organizations
            with customized, reliable, and cutting-edge solutions.
          </p>

          <div className="text-xl font-bold mt-6">Why Choose Our Software?</div>
          <div className="mt-1 text-sm">
            <p>
              Our software offers seamless maintenance, advanced security, and
              reliable support, keeping your business up-to-date. Enjoy flexible
              pricing, smart inventory management, easy integration with tools
              like scales and card machines, custom reports, and real-time sales
              tracking. Trusted in Sri Lanka, it boosts efficiency and growth
              for businesses of all sizes.
            </p>
          </div>

          <button
            className="mt-6 px-6 py-3 bg-[#ce521a] text-black font-bold font-semibold rounded-lg"
            onClick={() => navigate("/login")}
          >
            GET STARTED TODAY
          </button>

          <div className="flex space-x-10 justify-center mt-10">
            <a
              href="https://www.facebook.com/share/15xcMwvrPC/?mibextid=wwXIfr"
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="text-3xl">
                <FaFacebookSquare />
              </div>
            </a> 

            <a href="mailto:retailtarget@gmail.com">
              <div className="text-3xl">
                <MdEmail />
              </div>
            </a>

            <a href="tel:+94777108255">
              <div className="text-2xl">
                <FaPhoneAlt />
              </div>
            </a>

            <a href="sms:+94777121757 ">
              <div className="text-3xl">
                <IoChatbox />
              </div>
            </a>

            <a href="https://wa.me/94763165700">
              <div className="text-3xl">
                <IoLogoWhatsapp />
              </div>
            </a>
          </div>
        </div>

        <div className="w-full md:w-1/2 grid grid-cols-3 gap-4 p-8">
          <img
            className="w-full h-60 object-cover col-span-2 rounded-md"
            src={img1}
            alt="img1"
          />
          <img
            className="w-full h-48 object-cover col-span-1 mt-12 rounded-md"
            src={img2}
            alt="img2"
          />
          <img
            className="w-full h-48 object-cover col-span-1 rounded-md"
            src={img5}
            alt="img5"
          />
          <img
            className="w-full h-60 object-cover col-span-2 rounded-md"
            src={img4}
            alt="img4"
          />
        </div>
      </div>
    </div>
  );
};

export default Home;
