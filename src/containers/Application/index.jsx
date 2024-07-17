import { connect } from 'react-redux';
import Application from 'components/Application';
import { clearProject, openSettings, closeSettings, fetchSmd } from '../Project/actions';
import { get, isProjectCreated, areSettingsOpened } from '../Project/selectors';

export default connect(
    state => ({
        isProjectCreated: isProjectCreated(state),
        settingsOpen: areSettingsOpened(state),
        project: get(state),
    }),
    {
        clearProject,
        openSettings,
        closeSettings,
        fetchSmd
    }
)(Application);
