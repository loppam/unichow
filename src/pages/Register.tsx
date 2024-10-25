import React, { useState } from "react";
import { Link } from "react-router-dom";
import Logo from "../components/Logo";
import Input from "../components/Input";

export default function Register() {
  const [formData, setFormData] = useState({
    phone: "",
    email: "",
    firstName: "",
    lastName: "",
    birthday: "",
    address: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle registration logic here
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center p-4">
      <div className="w-full max-w-md">
        <Logo size="md" />
        <h1 className="text-2xl font-bold mb-2 text-center">
          Create your account
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Already have an account?{" "}
          <Link to="/login" className="text-black font-medium">
            Login
          </Link>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            name="phone"
            type="tel"
            placeholder="Phone number"
            value={formData.phone}
            onChange={handleChange}
          />
          <Input
            name="email"
            type="email"
            placeholder="Email address"
            value={formData.email}
            onChange={handleChange}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              name="firstName"
              placeholder="First name"
              value={formData.firstName}
              onChange={handleChange}
            />
            <Input
              name="lastName"
              placeholder="Last name"
              value={formData.lastName}
              onChange={handleChange}
            />
          </div>
          <Input
            name="birthday"
            type="date"
            placeholder="Birthday"
            value={formData.birthday}
            onChange={handleChange}
          />

          <Input
            name="address"
            placeholder="Address"
            value={formData.address}
            onChange={handleChange}
          />
          <button type="submit" className="btn-primary w-full">
            Create your account
          </button>
        </form>
      </div>
    </div>
  );
}
