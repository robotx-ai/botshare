"use client";

import useCountries from "@/hook/useCountries";
import { SafeUser } from "@/types";
import { motion } from "framer-motion";
import Image from "next/image";
import { CldVideoPlayer } from "next-cloudinary";
import Heading from "../Heading";
import HeartButton from "../HeartButton";

type Props = {
  title: string;
  locationValue: string;
  imageSrc: string;
  videoSrc?: string | null;
  id: string;
  currentUser?: SafeUser | null;
};

function ListingHead({
  title,
  locationValue,
  imageSrc,
  videoSrc,
  id,
  currentUser,
}: Props) {
  const { getByValue } = useCountries();
  const location = getByValue(locationValue);

  return (
    <>
      <Heading
        title={title}
        subtitle={`${location?.region}, ${location?.label}`}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          duration: 0.8,
          delay: 0.5,
          ease: [0, 0.71, 0.2, 1.01],
        }}
        className="w-full h-[60vh] overflow-hidden rounded-xl relative"
      >
        <Image
          src={imageSrc}
          alt="image"
          fill
          className="object-cover w-full"
        />
        <div className="absolute top-5 right-5">
          <HeartButton listingId={id} currentUser={currentUser} />
        </div>
      </motion.div>
      {videoSrc && (
        <div className="w-full mt-4 rounded-xl overflow-hidden">
          <CldVideoPlayer
            width="1920"
            height="1080"
            src={videoSrc}
            colors={{
              base: "#000000",
              text: "#ffffff",
              accent: "#404040",
            }}
            logo={false}
          />
        </div>
      )}
    </>
  );
}

export default ListingHead;
