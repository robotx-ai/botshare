"use client";

import { CldUploadWidget } from "next-cloudinary";
import React, { useCallback } from "react";
import { TbVideoPlus } from "react-icons/tb";

type Props = {
  onChange: (value: string) => void;
  value: string;
};

function VideoUpload({ onChange, value }: Props) {
  const handleCallback = useCallback(
    (result: any) => {
      onChange(result.info.public_id);
    },
    [onChange]
  );

  return (
    <CldUploadWidget
      onUpload={handleCallback}
      uploadPreset="cptcecyi"
      options={{
        maxFiles: 1,
        resourceType: "video",
      }}
    >
      {({ open }) => {
        return (
          <div
            onClick={() => open?.()}
            className="relative cursor-pointer hover:opacity-70 transition border-dashed border-2 p-20 border-neutral-300 flex flex-col justify-center items-center gap-4 text-neutral-600"
          >
            <TbVideoPlus size={50} />
            <div className="font-semibold text-lg">
              Click to upload video (optional)
            </div>
            {value && (
              <div className="absolute inset-0 w-full h-full">
                <video
                  src={`https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/video/upload/${value}`}
                  className="object-cover w-full h-full"
                  muted
                  playsInline
                />
              </div>
            )}
          </div>
        );
      }}
    </CldUploadWidget>
  );
}

export default VideoUpload;
