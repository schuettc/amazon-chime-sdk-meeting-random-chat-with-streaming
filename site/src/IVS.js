import React, { useEffect, useRef } from 'react';

function AmazonIVS(options) {
    const divEl = useRef(null);
    const videoEl = useRef(null);

    useEffect(() => {
        const script = document.createElement('script');

        script.src = 'https://player.live-video.net/1.0.0/amazon-ivs-player.min.js';
        script.async = true;

        document.body.appendChild(script);

        script.onload = () => {
            // eslint-disable-next-line no-undef
            if (IVSPlayer.isPlayerSupported) {
                // eslint-disable-next-line no-undef
                const player = IVSPlayer.create();
                player.attachHTMLVideoElement(document.getElementById('video-player'));
                console.log(options.playbackUrl);
                player.load(options.playbackUrl);
                player.play();
            }
        };

        return () => {
            document.body.removeChild(script);
        };
    }, []);

    return (
        <div ref={divEl}>
            <video id="video-player" ref={videoEl} playsInline autoPlay height={200} controls />
        </div>
    );
}

export default AmazonIVS;
