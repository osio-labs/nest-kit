/** Resolves to `sharp` module when installed. This is an optional peer dep. */
export async function loadSharp(): Promise<any> {
  try {
    // @ts-expect-error — optional peer dependency
    return await import('sharp');
  } catch {
    throw new Error(
      'Cannot find module "sharp". Install the optional peer dependency:\n\n' +
        '  npm install sharp\n',
    );
  }
}

/** Resolves to `@aws-sdk/client-s3` module when installed. This is an optional peer dep. */
export async function loadS3Client(): Promise<any> {
  try {
    // @ts-expect-error — optional peer dependency
    return await import('@aws-sdk/client-s3');
  } catch {
    throw new Error(
      'Cannot find module "@aws-sdk/client-s3". Install the optional peer dependency:\n\n' +
        '  npm install @aws-sdk/client-s3\n',
    );
  }
}

/** Resolves to `@aws-sdk/s3-request-presigner` module when installed. This is an optional peer dep. */
export async function loadS3Presigner(): Promise<any> {
  try {
    // @ts-expect-error — optional peer dependency
    return await import('@aws-sdk/s3-request-presigner');
  } catch {
    throw new Error(
      'Cannot find module "@aws-sdk/s3-request-presigner". Install the optional peer dependency:\n\n' +
        '  npm install @aws-sdk/s3-request-presigner\n',
    );
  }
}

/** Resolves to `@google-cloud/storage` module when installed. This is an optional peer dep. */
export async function loadGCS(): Promise<any> {
  try {
    // @ts-expect-error — optional peer dependency
    return await import('@google-cloud/storage');
  } catch {
    throw new Error(
      'Cannot find module "@google-cloud/storage". Install the optional peer dependency:\n\n' +
        '  npm install @google-cloud/storage\n',
    );
  }
}
