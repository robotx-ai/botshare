"use client";

import useLoginModel from "@/hook/useLoginModal";
import useRegisterModal from "@/hook/useRegisterModal";
import axios from "axios";
import { useCallback, useState } from "react";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { TbRobot } from "react-icons/tb";
import { MdOutlineStorefront } from "react-icons/md";

import Button from "../Button";
import Heading from "../Heading";
import Input from "../inputs/Input";
import Modal from "./Modal";

type UserType = "CUSTOMER" | "PROVIDER";

function RegisterModal() {
  const registerModel = useRegisterModal();
  const loginModel = useLoginModel();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [userType, setUserType] = useState<UserType | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FieldValues>({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      phone: "",
      businessName: "",
    },
  });

  const handleClose = useCallback(() => {
    setStep(1);
    setUserType(null);
    reset();
    registerModel.onClose();
  }, [registerModel, reset]);

  const handleSelectType = useCallback((type: UserType) => {
    setUserType(type);
    setStep(2);
  }, []);

  const handleBack = useCallback(() => {
    setStep(1);
    setUserType(null);
  }, []);

  const onSubmit: SubmitHandler<FieldValues> = (data) => {
    if (!userType) return;
    setIsLoading(true);

    axios
      .post("/api/register", { ...data, userType })
      .then(() => {
        toast.success("Account created! Please log in.");
        loginModel.onOpen();
        handleClose();
      })
      .catch(() => toast.error("Something went wrong."))
      .finally(() => setIsLoading(false));
  };

  const toggle = useCallback(() => {
    loginModel.onOpen();
    handleClose();
  }, [loginModel, handleClose]);

  const step1Body = (
    <div className="flex flex-col gap-6">
      <Heading
        title="Welcome to BotSharing US"
        subtitle="How would you like to use BotSharing US?"
        center
      />
      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => handleSelectType("CUSTOMER")}
          className="flex flex-col items-center gap-3 p-6 border-2 border-neutral-200 rounded-xl hover:border-black transition cursor-pointer text-center"
        >
          <TbRobot size={36} className="text-neutral-700" />
          <span className="font-semibold text-neutral-800">Rent a Robot</span>
          <span className="text-sm text-neutral-500 font-light">
            Find and book robot services for your needs
          </span>
        </button>
        <button
          type="button"
          onClick={() => handleSelectType("PROVIDER")}
          className="flex flex-col items-center gap-3 p-6 border-2 border-neutral-200 rounded-xl hover:border-black transition cursor-pointer text-center"
        >
          <MdOutlineStorefront size={36} className="text-neutral-700" />
          <span className="font-semibold text-neutral-800">List my Robot</span>
          <span className="text-sm text-neutral-500 font-light">
            Offer your robot services to customers
          </span>
        </button>
      </div>
    </div>
  );

  const step2Body = (
    <div className="flex flex-col gap-4">
      <Heading
        title={userType === "PROVIDER" ? "Create a provider account" : "Create an account"}
        subtitle={userType === "PROVIDER" ? "List your robot services on BotSharing US" : "Book robot services with BotSharing US"}
        center
      />
      <Input
        id="email"
        label="Email Address"
        disabled={isLoading}
        register={register}
        errors={errors}
        required
      />
      <Input
        id="name"
        label="User Name"
        disabled={isLoading}
        register={register}
        errors={errors}
        required
      />
      <Input
        id="password"
        label="Password"
        type="password"
        disabled={isLoading}
        register={register}
        errors={errors}
        required
      />
      {userType === "PROVIDER" && (
        <>
          <Input
            id="phone"
            label="Phone Number (optional)"
            disabled={isLoading}
            register={register}
            errors={errors}
          />
          <Input
            id="businessName"
            label="Business Name (optional)"
            disabled={isLoading}
            register={register}
            errors={errors}
          />
        </>
      )}
    </div>
  );

  const footerContent = (
    <div className="flex flex-col gap-4 mt-3">
      <hr />
      <div className="text-neutral-500 text-center mt-4 font-light">
        Already have an account?{" "}
        <span
          onClick={toggle}
          className="text-neutral-800 cursor-pointer hover:underline"
        >
          Log in
        </span>
      </div>
    </div>
  );

  if (step === 1) {
    return (
      <Modal
        isOpen={registerModel.isOpen}
        title="Sign Up"
        actionLabel=""
        onClose={handleClose}
        onSubmit={() => {}}
        body={step1Body}
        footer={footerContent}
      />
    );
  }

  return (
    <Modal
      disabled={isLoading}
      isOpen={registerModel.isOpen}
      title="Sign Up"
      actionLabel="Create Account"
      secondaryActionLabel="Back"
      secondaryAction={handleBack}
      onClose={handleClose}
      onSubmit={handleSubmit(onSubmit)}
      body={step2Body}
      footer={footerContent}
    />
  );
}

export default RegisterModal;
