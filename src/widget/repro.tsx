const { widget } = figma;
const { Frame, AutoLayout } = widget;

function ImageCrashRepro() {
    return (
        <AutoLayout direction="vertical" spacing={20} padding={20}>
            {/* 1. Known-good data URI from docs */}
            <Frame
                width={100}
                height={100}
                fill={{
                    type: 'image',
                    src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAsAAAALCAYAAACprHcmAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAECSURBVHgBpY87TwJBFIXPnVkhbqQQE7UQNWhrsdpLI40FsdSYGGNvbWFhZ2Jj+AWER0fFD6CAhhYCod8GGmCLJRAI2Rl22LDh1RBOc1/fzb0H2EK0WPSfzj+lxG3wMIpAOKpaZfpPpddgKxG510BllSsw6MGAEAYl0zWVMn+L8boEzOXD0oRwrI1vZF9ESRetWO94XMjEDwxb0xttTF6txyNbzbU5mHmWhhtiQ3aGSkQmTH129YJLunJjdQned9DshkbF8d7o4cRiOSB0475ld+JUnTM+/Pb1d0p8ck2eKXN49/OOFfkGOXfCLnjpdamNDfLhgfFdIyE+GOg3AJHHrpoC5YtKfAfixH0AAAAASUVORK5CYII=',
                }}
            />

            {/* 2. Remote URL */}
            <Frame
                width={100}
                height={100}
                fill={{
                    type: 'image',
                    src: 'https://picsum.photos/200/200',
                }}
            />
        </AutoLayout>
    );
}

widget.register(ImageCrashRepro);
