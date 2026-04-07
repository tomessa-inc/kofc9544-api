import {teamMapper} from "./mapper";
import {OptionsPlayer} from "./controllers/golf.controller";


const optionsPlayer: OptionsPlayer  = {
    "team_name": "tom1",
    "players": [
        {
            "player": "todalow",
            "email": "tcruicksh@gmail.com",
            "phone": "613-111-1111",
            "allergies": "pepper"
        },
        {
            "player": "todalow2",
            "email": "tcruicksh@gmail.com",
            "phone": "613-111-1111",
            "allergies": "pepper"
        }

    ],
    "email_type": "register"
}


optionsPlayer.individual = true;

const check = teamMapper.createTeamRegistration(optionsPlayer)

console.log(check)

