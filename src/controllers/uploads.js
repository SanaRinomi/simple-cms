

const isImage = function(mime) {
    return mime.includes("image/");
};

const isVideo = function(mime) {
    return mime.includes("video/");
};

const isAudio = function(mime) {
    return mime.includes("audio/");
};

const isText = function(mime) {
    return mime.includes("text/");
};

const isApplication = function(mime) {
    return mime.includes("application/");
};

const isMIME = function(mime) {
    const image = isImage(mime);
    const video = isVideo(mime);
    const audio = isAudio(mime);
    const text = isText(mime);
    const application = isApplication(mime);

    return {
        image,
        video,
        audio,
        text,
        application,
        type: image ? "image" : video ? "video" : audio ? "audio" : text ? "text" : "application" 
    }
};

module.exports = {
    isImage,
    isVideo,
    isAudio,
    isText,
    isApplication,
    isMIME
}